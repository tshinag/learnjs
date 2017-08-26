var http = require("http");
var AWS = require("aws-sdk");

AWS.config.region = "us-east-1";

var config = {
  dynamoTableName: "learnjs",
};

/*
example:
  reduceItems({}, [{ answer: "X" }, { answer: "Y" }, { answer: "X" }])
    => { "X": 2, "Y": 1 }
*/
function reduceItems(memo, items) {
  items.forEach(function(item) {
    memo[item.answer] = (memo[item.answer] || 0) + 1;
  });
  return memo;
}

/*
example:
  filterItems({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })
    => { b: 2, c: 3, d: 4, e: 5, f: 6 }
*/
function filterItems(items) {
  var values = [];
  for (var i in items) {
    values.push({ value: items[i], key: i });
  }

  var topFive = {};
  var byCount = function(x, y) {
    return x.value - y.value;
  };
  values.sort(byCount).slice(0, 5).forEach(function(e) {
    topFive[e.key] = e.value;
  });

  return topFive;
}

exports.dynamodb = new AWS.DynamoDB.DocumentClient();

exports.popularAnswers = function(json, context) {
  exports.dynamodb.scan({
    FilterExpression: "problemId = :problemId",
    ExpressionAttributeValues: {
      ":problemId": json.problemNumber
    },
    TableName: config.dynamoTableName
  }, function(error, data) {
    if (error) {
      context.fail(error);
    }
    else {
      var result = filterItems(reduceItems({}, data.Items));
      context.succeed(result);
    }
  });
};

exports.echo = function(json, context) {  
  context.succeed(["Hello from the cloud! You sent " + JSON.stringify(json)]);
};
