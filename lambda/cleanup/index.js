const AWS = require('aws-sdk');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// 環境変数
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

/**
 * クリーンアップバッチ処理ハンドラー
 * EventBridge (CloudWatch Events) から日次実行される
 */
exports.handler = async (event) => {
  try {
    // 現在の日時
    const now = new Date();
    
    // 1. 期限切れリクエストのクローズ
    await closeExpiredRequests(now);
    
    // 2. 未選択画像の削除（リクエストがクローズしてから30日経過）
    await cleanupUnselectedImages(now);
    
    // 3. 購入済み画像の削除（購入から7日経過）
    await cleanupPurchasedImages(now);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'クリーンアップバッチを実行しました。'
      })
    };
  } catch (error) {
    console.error('クリーンアップバッチエラー:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'クリーンアップバッチ実行中にエラーが発生しました。'
      })
    };
  }
};

/**
 * 期限切れリクエストをクローズする
 */
async function closeExpiredRequests(now) {
  // 期限切れリクエストを検索
  const expiredRequestsParams = {
    TableName: REQUESTS_TABLE,
    FilterExpression: '#status = :openStatus AND deadline < :now',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':openStatus': 'open',
      ':now': now.toISOString()
    }
  };
  
  const expiredRequests = await dynamodb.scan(expiredRequestsParams).promise();
  
  // 各リクエストをクローズ
  const updatePromises = expiredRequests.Items.map(request => {
    const params = {
      TableName: REQUESTS_TABLE,
      Key: {
        requestId: request.requestId
      },
      UpdateExpression: 'set #status = :closedStatus, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':closedStatus': 'expired',
        ':updatedAt': now.toISOString()
      }
    };
    
    return dynamodb.update(params).promise();
  });
  
  // 更新処理を実行
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
    console.log(`${updatePromises.length} 件の期限切れリクエストをクローズしました。`);
  }
}

/**
 * 未選択画像を削除（リクエストがクローズしてから30日経過）
 */
async function cleanupUnselectedImages(now) {
  // 30日前の日時
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // クローズされたリクエストを検索（30日以上前）
  const closedRequestsParams = {
    TableName: REQUESTS_TABLE,
    FilterExpression: '(#status = :closedStatus OR #status = :expiredStatus) AND updatedAt < :thirtyDaysAgo',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':closedStatus': 'closed',
      ':expiredStatus': 'expired',
      ':thirtyDaysAgo': thirtyDaysAgo.toISOString()
    }
  };
  
  const closedRequests = await dynamodb.scan(closedRequestsParams).promise();
  
  // 各リクエストの未選択エントリーを処理
  for (const request of closedRequests.Items) {
    // リクエストに対する未選択エントリーを検索
    const unselectedEntriesParams = {
      TableName: ENTRIES_TABLE,
      IndexName: 'RequestIndex',
      KeyConditionExpression: 'requestId = :requestId',
      FilterExpression: 'selected = :notSelected',
      ExpressionAttributeValues: {
        ':requestId': request.requestId,
        ':notSelected': false
      }
    };
    
    const unselectedEntries = await dynamodb.query(unselectedEntriesParams).promise();
    
    // 未選択エントリーのS3オブジェクトを削除
    const s3DeletePromises = [];
    
    for (const entry of unselectedEntries.Items) {
      // オリジナル画像を削除
      s3DeletePromises.push(
        s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: entry.fileKey
        }).promise()
      );
      
      // サムネイル画像を削除
      s3DeletePromises.push(
        s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: entry.thumbnailKey
        }).promise()
      );
      
      // 後でDynamoDBからも削除するためにエントリーIDを記録
      entry.toDelete = true;
    }
    
    // S3から未選択画像を削除
    if (s3DeletePromises.length > 0) {
      await Promise.all(s3DeletePromises);
      console.log(`リクエストID ${request.requestId} の未選択画像 ${s3DeletePromises.length / 2} 件を S3 から削除しました。`);
    }
    
    // DynamoDBから未選択エントリーを削除
    const dynamoDeletePromises = unselectedEntries.Items
      .filter(entry => entry.toDelete)
      .map(entry => {
        return dynamodb.delete({
          TableName: ENTRIES_TABLE,
          Key: {
            entryId: entry.entryId
          }
        }).promise();
      });
    
    if (dynamoDeletePromises.length > 0) {
      await Promise.all(dynamoDeletePromises);
      console.log(`リクエストID ${request.requestId} の未選択エントリー ${dynamoDeletePromises.length} 件を DynamoDB から削除しました。`);
    }
  }
}

/**
 * 購入済み画像を削除（購入から7日経過）
 */
async function cleanupPurchasedImages(now) {
  // 7日前の日時
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // 7日以上前に購入されたエントリーを検索
  const oldPurchasedEntriesParams = {
    TableName: ENTRIES_TABLE,
    FilterExpression: 'purchased = :purchased AND updatedAt < :sevenDaysAgo',
    ExpressionAttributeValues: {
      ':purchased': true,
      ':sevenDaysAgo': sevenDaysAgo.toISOString()
    }
  };
  
  const oldPurchasedEntries = await dynamodb.scan(oldPurchasedEntriesParams).promise();
  
  // S3オブジェクトを削除
  const s3DeletePromises = [];
  
  for (const entry of oldPurchasedEntries.Items) {
    // オリジナル画像を削除
    s3DeletePromises.push(
      s3.deleteObject({
        Bucket: S3_BUCKET,
        Key: entry.fileKey
      }).promise()
    );
    
    // サムネイル画像を削除
    s3DeletePromises.push(
      s3.deleteObject({
        Bucket: S3_BUCKET,
        Key: entry.thumbnailKey
      }).promise()
    );
  }
  
  // S3から購入済み画像を削除
  if (s3DeletePromises.length > 0) {
    await Promise.all(s3DeletePromises);
    console.log(`購入から7日経過した画像 ${s3DeletePromises.length / 2} 件を S3 から削除しました。`);
  }
  
  // 注: この実装では購入済みエントリー自体はDynamoDBに残します
  // 購入履歴として参照できるようにするため
}