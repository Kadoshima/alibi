const AWS = require('aws-sdk');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

// 環境変数
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const EMAIL_SENDER = process.env.EMAIL_SENDER;

/**
 * 決済コールバック処理ハンドラー
 */
exports.handler = async (event) => {
  try {
    // リクエストボディのパース
    // 注: 各決済プロバイダからのWebhookのフォーマットに合わせる必要がある
    const requestBody = JSON.parse(event.body);
    const { 
      session_id,  // 決済プロバイダが返すセッションID
      status,      // 'success', 'failed', 'canceled' など
      transaction_id // 決済プロバイダ側のトランザクションID
    } = requestBody;
    
    // 必須フィールドの検証
    if (!session_id || !status) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'セッションIDと決済ステータスは必須です。' 
        })
      };
    }
    
    // 署名検証（実際の実装ではWebhookの署名検証を行う）
    // validateSignature(event.headers, event.body);
    
    // セッションIDに対応する決済情報を取得
    const payment = await getPaymentBySessionId(session_id);
    if (!payment) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '対応する決済情報が見つかりません。' 
        })
      };
    }
    
    // 決済ステータスを更新
    let paymentStatus = 'error';
    
    if (status === 'success' || status === 'paid') {
      paymentStatus = 'completed';
    } else if (status === 'failed') {
      paymentStatus = 'failed';
    } else if (status === 'canceled') {
      paymentStatus = 'canceled';
    }
    
    // 決済情報の更新
    await updatePaymentStatus(
      payment.paymentId, 
      paymentStatus, 
      transaction_id
    );
    
    // 決済が成功した場合、エントリーの購入状態を更新
    if (paymentStatus === 'completed') {
      await updateEntryPurchasedStatus(payment.entryId, true);
      
      // 買い手と売り手に通知メールを送信
      await sendPaymentSuccessEmails(payment);
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'コールバックを正常に処理しました。',
        status: paymentStatus
      })
    };
  } catch (error) {
    console.error('決済コールバックエラー:', error);
    
    // エラーが発生しても決済プロバイダには 200 を返す
    // （多くの決済プロバイダは、エラーレスポンスを受け取るとリトライする）
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'エラーが発生しましたが、リトライは必要ありません。',
        error: error.message
      })
    };
  }
};

/**
 * セッションIDによる決済情報の取得
 */
async function getPaymentBySessionId(sessionId) {
  // 実装例: sessionId をインデックスで検索するか、全件スキャンする
  const params = {
    TableName: PAYMENTS_TABLE,
    FilterExpression: 'sessionId = :sessionId',
    ExpressionAttributeValues: {
      ':sessionId': sessionId
    }
  };
  
  const result = await dynamodb.scan(params).promise();
  
  if (result.Items.length === 0) {
    return null;
  }
  
  return result.Items[0];
}

/**
 * 決済情報のステータス更新
 */
async function updatePaymentStatus(paymentId, status, transactionId) {
  const params = {
    TableName: PAYMENTS_TABLE,
    Key: {
      paymentId
    },
    UpdateExpression: 'set #status = :status, transactionId = :transactionId, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'  // status は DynamoDB の予約語
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':transactionId': transactionId || null,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  return dynamodb.update(params).promise();
}

/**
 * エントリーの購入状態を更新
 */
async function updateEntryPurchasedStatus(entryId, purchased) {
  const params = {
    TableName: ENTRIES_TABLE,
    Key: {
      entryId
    },
    UpdateExpression: 'set purchased = :purchased, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':purchased': purchased,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  return dynamodb.update(params).promise();
}

/**
 * 決済成功通知メールの送信
 */
async function sendPaymentSuccessEmails(payment) {
  // エントリー情報の取得
  const entry = await getEntryById(payment.entryId);
  if (!entry) {
    throw new Error('通知メール送信中にエントリー情報が見つかりませんでした。');
  }
  
  // 買い手向けメール
  const buyerParams = {
    Source: EMAIL_SENDER,
    Destination: {
      ToAddresses: [payment.buyerEmail] // 実際には別途ユーザー情報から取得
    },
    Message: {
      Subject: {
        Data: '【写真マーケットプレイス】購入が完了しました'
      },
      Body: {
        Text: {
          Data: `購入が完了しました。\n\n商品: ${entry.title}\n価格: ${payment.amount}円\n\nダウンロードは以下URLからできます。\nhttps://example.com/downloads/${payment.requestId}/${entry.entryId}`
        }
      }
    }
  };
  
  // 売り手向けメール
  const sellerParams = {
    Source: EMAIL_SENDER,
    Destination: {
      ToAddresses: [entry.sellerEmail] // 実際には別途ユーザー情報から取得
    },
    Message: {
      Subject: {
        Data: '【写真マーケットプレイス】あなたの写真が購入されました'
      },
      Body: {
        Text: {
          Data: `あなたの写真が購入されました。\n\n商品: ${entry.title}\n価格: ${payment.amount}円\n\n詳細は以下URLからご確認ください。\nhttps://example.com/sales/${payment.requestId}/${entry.entryId}`
        }
      }
    }
  };
  
  // メール送信は実際の実装では Promise.all でまとめて送信
  // await Promise.all([
  //   ses.sendEmail(buyerParams).promise(),
  //   ses.sendEmail(sellerParams).promise()
  // ]);
  
  // デバッグ用に、本来はメールを送信する
  console.log('買い手向けメール:', buyerParams);
  console.log('売り手向けメール:', sellerParams);
}

/**
 * エントリーID による応募情報の取得
 */
async function getEntryById(entryId) {
  const params = {
    TableName: ENTRIES_TABLE,
    Key: {
      entryId
    }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item;
}