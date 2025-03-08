const AWS = require('aws-sdk');

// 環境変数から AWS リージョンを取得
const region = process.env.AWS_REGION || 'ap-northeast-1';

// AWS SDK のグローバル設定
AWS.config.update({ region });

// DynamoDB クライアントの初期化
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * DynamoDB への項目取得操作をラップ
 */
const getItem = async (params) => {
  try {
    const result = await dynamoDb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('DynamoDB Get エラー:', error);
    throw error;
  }
};

/**
 * DynamoDB への項目保存操作をラップ
 */
const putItem = async (params) => {
  try {
    return await dynamoDb.put(params).promise();
  } catch (error) {
    console.error('DynamoDB Put エラー:', error);
    throw error;
  }
};

/**
 * DynamoDB への項目更新操作をラップ
 */
const updateItem = async (params) => {
  try {
    return await dynamoDb.update(params).promise();
  } catch (error) {
    console.error('DynamoDB Update エラー:', error);
    throw error;
  }
};

/**
 * DynamoDB への項目削除操作をラップ
 */
const deleteItem = async (params) => {
  try {
    return await dynamoDb.delete(params).promise();
  } catch (error) {
    console.error('DynamoDB Delete エラー:', error);
    throw error;
  }
};

/**
 * DynamoDB へのクエリ操作をラップ
 */
const query = async (params) => {
  try {
    const result = await dynamoDb.query(params).promise();
    return result;
  } catch (error) {
    console.error('DynamoDB Query エラー:', error);
    throw error;
  }
};

/**
 * DynamoDB へのスキャン操作をラップ
 */
const scan = async (params) => {
  try {
    const result = await dynamoDb.scan(params).promise();
    return result;
  } catch (error) {
    console.error('DynamoDB Scan エラー:', error);
    throw error;
  }
};

/**
 * テーブルからアイテムを ID で取得
 */
const getById = async (tableName, idField, idValue) => {
  const params = {
    TableName: tableName,
    Key: {
      [idField]: idValue
    }
  };
  
  return getItem(params);
};

/**
 * 指定されたインデックスでテーブルから 1 項目をクエリ
 */
const queryOneByIndex = async (tableName, indexName, keyField, keyValue) => {
  const params = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: `${keyField} = :value`,
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    Limit: 1
  };
  
  const result = await query(params);
  return result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * 指定されたインデックスでテーブルから複数項目をクエリ
 */
const queryByIndex = async (tableName, indexName, keyField, keyValue, limit = 20, nextToken = null) => {
  const params = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: `${keyField} = :value`,
    ExpressionAttributeValues: {
      ':value': keyValue
    },
    Limit: limit
  };
  
  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }
  
  const result = await query(params);
  
  // 結果オブジェクトを作成
  const response = {
    items: result.Items,
    count: result.Count
  };
  
  // 継続トークンがあれば追加
  if (result.LastEvaluatedKey) {
    response.nextToken = Buffer.from(
      JSON.stringify(result.LastEvaluatedKey)
    ).toString('base64');
  }
  
  return response;
};

// エクスポート
module.exports = {
  dynamoDb,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  query,
  scan,
  getById,
  queryOneByIndex,
  queryByIndex
};