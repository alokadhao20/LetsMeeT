var express = require('express');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use('/static', express.static(path.join(__dirname, '/../public')))
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/../index.html'));
});
console.log(__dirname);
// app.get('/index', function(req, res){
//   res.sendfile(__dirname+'/index.html');
// });

users = {};

io.on('connection', function (connection) {
  console.log('a user connected');

  connection.on('message', function (message) {
    console.log("Message received  - ", message);
    
    var data = message;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Error parsing JSON", message);
      data = {};
    }

    console.log("Message received  - ", data);

    switch (data.type) {
      case "login":
        console.log("User logged in as", data.name);
        if (users[data.name]) {
          console.log("in if ");
          sendTo(connection, {
            type: "login",
            success: false
          });
        } else {
          console.log("in else ");
          users[data.name] = connection;
          connection.name = data.name;
          sendTo(connection, {
            type: 'login',
            success: true
          });
        }

        break;
      case "candidate":

        console.log("Sending candidate to", data.name);
        var conn = users[data.name];

        if (conn != null) {
          sendTo(conn, {
            type: "candidate",
            candidate: data.candidate
          });
        }

        break;

      case "offer":
      // console.log("users - ", users);
        console.log("Sending offer to", data.name);
        var conn = users[data.name];
        //console.log("conn----------------", conn);
        if (conn != null) {
          connection.otherName = data.name;
          sendTo(conn, {
            type: "offer",
            offer: data.offer,
            name: connection.name
          });
        } else {
          console.log("Connection is null", conn);
        }
        break;

        case "answer":
        console.log("Sending answer to", data.name);
        var conn = users[data.name];

        if (conn != null) {
          connection.otherName = data.name;
          sendTo(conn, {
            type: "answer",
            answer: data.answer
          });
        } else {
          console.log("Connection is null", conn);
        }

        break;

        case "leave":
        console.log("Disconnecting user from", data.name);
        var conn = users[data.name];
        if(conn && conn.otherName) {
          conn.otherName = null;
        }
        

        if (conn != null) {
          sendTo(conn, {
            type: "leave"
          });
        }

        break;

      default:
        sendTo(connection, {
          type: "error",
          message: "Unrecognized command: " + data.type
        });

        break;
    }
  });

  connection.on('disconnect', function () {
    console.log("Connection disconnect", connection.name);
    if (connection.name) {
      delete users[connection.name];
    }
  });


  connection.on('close', function () {
    console.log("Connection closed", connection.name);
    if (connection.name) {
      delete users[connection.name];
    }
  });
});

function sendTo(conn, message) {
  console.log("sending message ", message);
  conn.emit(message.type, message);
  //conn.send(JSON.stringify(message));
}

http.listen(3000, function () {
  console.log('listening on *:3000');
});