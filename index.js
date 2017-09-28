var ss = require('socket.io-stream');
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var util = require('util');

app.set('views', path.join(__dirname, 'views'));

app.use('/vids', express.static(__dirname + '/video'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/css', express.static(__dirname + '/public/css')); // redirect CSS bootstrap
app.use('/fonts', express.static(__dirname + '/public/fonts'));

app.get('/', function(req,res){
	res.sendFile(__dirname + '/views/user1Boot.html');
});

var server_port = process.env.PORT || 8080;
var server = app.listen(server_port, function(){
	console.log("Listening on " 
           + ", server_port " + server_port);
});

var video_dir = path.join(process.cwd(), 'video/');

if (!fs.existsSync(video_dir))
    fs.mkdirSync(video_dir);


var io = require('socket.io')(server);

var users = [];
var rooms = [];
io.on('connection',function(socket){
	//##### SOCKET INIT
	console.log('socket connected');
	socket.video = '';
	users.push(socket);
	
	
	//##### SOCKET EVENTS
	socket.on('disconnect',function(){
		console.log('socket disconnected');
		var index = users.indexOf(socket);
		if (index > -1) {
			users.splice(index,1);
		}
		if (typeof socket.video !== 'undefined' && socket.video ){
			//check if somebody else is watching. if not, delete file
			var canClose = 1;
			users.forEach(function(item){
				if(item.video == socket.video){
					canClose = 0;
					console.log('don`t close!!!!');
				}
			});
			if(canClose == 1){
				if (fs.existsSync(__dirname + '/video/' + socket.video + '.mp4')) {	//check if file exists...maybe it was erased
					fs.unlink(__dirname + '/video/' + socket.video + '.mp4');
				}
			} else{
				
			}
		}
		if(typeof socket.roomName !== 'undefined' && socket.roomName && socket.roomName != 'lobby'){
			userLeaveRoom(socket.roomName, socket);
		}
	});
	//##### pauseVid event 
	socket.on('pauseVid',function(time){
		console.log('pause');
		if(socket.roomName != 'lobby')
			io.to(socket.roomName).emit('pauseVid', time);
		else 
			socket.emit('someError', 'You can\'t do that here.');
	});
	//##### playVid event 
	socket.on('playVid',function(){
		console.log('play');
		if(socket.roomName != 'lobby')
			io.to(socket.roomName).emit('playVid');
		else 
			socket.emit('someError', 'You can\'t do that here.');
	});
	//##### changeVideoPosition event
	socket.on('changeVideoPosition',function(time){
		io.to(socket.roomName).emit('pauseVid',time);
	});
	
	//##### getRoomList event
	socket.on('getRoomList',function(){
		socket.emit('hereAreTheRooms', rooms);
	});
	
	socket.on('salut',function(){
		console.log('socket says hi');
		io.to('lobby').emit('test','hello to all in lobby');
	});
	//##### youtube link input
	socket.on('youtube',function(ytLink){
		if(socket.roomName != 'lobby'){	//must check if watched another one before. if so, delete that one
			if(socket.roomAdmin == true){
				io.to(socket.roomName).emit('prepareForNewVideo');
				if(socket.video != ''){
					fs.unlink(__dirname + '/video/' + socket.video + '.mp4');
				}
				console.log('sbd upload');
				var videoName = Date.now();
				downloadYTVideo(ytLink,videoName, socket.roomName);
			} else {
				socket.emit('someError','Only the administrator of the room can change the video. Make another room :D');
			}
		} else{ //user can't play link here
			socket.emit('someError','You can\'t play videos here.');
		}
	});
	//#### userRegister event
	socket.on('registerUser',function(name){
		var userExists = 0;
		users.forEach(function(item){
			if(item.userName == name)
				userExists = 1;
		});
		if(userExists == 0){
			socket.userName = name;
			socket.roomName = 'lobby';
			socket.join('lobby');
			socket.emit('registerOk', name);
			socket.emit('goToLobby');
			//io.to('lobby').emit('connectedUsersList', getConnectedUsersFromRoom('lobby'));	same here. won't show it in lobby
		} else{
			socket.emit('someError', 'User already registered');
		}
	});
	
	socket.on('getConnectedUsers', function(){
		socket.emit('connectedUsersList', getConnectedUsersFromRoom(socket.roomName));
	});
	
	socket.on('createRoom', function(roomName){
		if(roomName != ''){
			var index = rooms.indexOf(roomName);
			if(index == -1){
				rooms.push(roomName);
				socket.leave('lobby');
				socket.join(roomName);
				socket.roomName = roomName;
				socket.roomAdmin = true;
				socket.video = '';
				socket.emit('adminGoToRoom', roomName);
				io.to('lobby').emit('newRoomCreated', roomName);
				//io.to('lobby').emit('connectedUsersList', getConnectedUsersFromRoom('lobby'));
				io.to(roomName).emit('connectedUsersList', getConnectedUsersFromRoom(roomName));
			} else{
				socket.emit('someError', 'Room already exists');
			}
		} else {
			socket.emit('someError', 'Room name cannot be empty');
		}
	});
	
	socket.on('joinRoom', function(roomName){
		if(roomName != ''){
			var index = rooms.indexOf(roomName);
			if(index != -1){
				socket.leave('lobby');
				socket.join(roomName);
				socket.roomName = roomName;
				socket.video = '';
				socket.roomAdmin = false;
				socket.emit('userGoToRoom', roomName);
				//io.to('lobby').emit('connectedUsersList', getConnectedUsersFromRoom('lobby'));
				io.to(roomName).emit('connectedUsersList', getConnectedUsersFromRoom(roomName));
				
				// Must get video details from room
				var found = 0;
				users.forEach(function(item){
					if(item.roomName == roomName && item.userName != socket.userName && found == 0){
						item.emit('getVideoDetailsForUserWhoJoined', socket.userName);
						found = 1;
					}
				});
			} else{
				socket.emit('someError', 'Room does not exist');
			}
		} else{
			socket.emit('someError', 'Room name cannot be empty');
		}
	});
	
	socket.on('videoDetailsForUser', function(details){
		var found = 0;
		users.forEach(function(item){
			if(item.userName == details.forUser && found == 0){
				found = 1;
				item.emit('joinedUserSync', details);
			}
		})
	});
	
	socket.on('leaveRoom', function(roomName){		//leave room means return to lobby
		userLeaveRoom(roomName, socket);
	});
	
	//TODO: socket.on('local',function())
});

function userLeaveRoom(roomName, socket){
	if(socket.roomAdmin == true){
		console.log('admin a iesit');
	} else{
		console.log('un user a iesit');
	}
	socket.leave(roomName);
	socket.join('lobby');
	socket.roomName = 'lobby';
	socket.emit('goToLobby');
	io.to(roomName).emit('connectedUsersList', getConnectedUsersFromRoom(roomName));
	//io.to('lobby').emit('connectedUsersList', getConnectedUsersFromRoom('lobby')); don't need to tell the lobby it's connected users but...i won't delete this
	
	var usersInRoom = 0;
	users.forEach(function(item){
		if(item.roomName == roomName)
			usersInRoom ++;
	});
	if(usersInRoom == 0){		//delete the room and the video file from server
		var index = rooms.indexOf(roomName);	//it sure exists
		rooms.splice(index,1);
		if (fs.existsSync(__dirname + '/video/' + socket.video + '.mp4')) {	//check if file exists...maybe it never existed
			fs.unlink(__dirname + '/video/' + socket.video + '.mp4');
		}
		io.to('lobby').emit('removeRoom', roomName);
	}
}

function downloadYTVideo(url, videoName, roomName){
	var fs = require('fs');
	var youtubedl = require('youtube-dl');
	var video = youtubedl(url, ['-f best', '--username=good_dog2303@yahoo.com', '--password=parolagood'], { cwd: __dirname + '/video' });
	var pos = 0;
	var size = 0;
	// Will be called when the download starts. 
	video.on('info', function(err, info) {
		console.log('Download started');
		console.log('filename: ' + info._filename);
		console.log('size: ' + info.size);
		size = info.size;
	});
	
	video.on('end', function() {
		console.log('finished downloading video!');
		users.forEach(function(item){
			if(item.roomName == roomName){
				console.log('adaugat video la socket.');
				item.emit('loadYTVideo', videoName);
				item.video = videoName;
			}
		});
	});
	
	video.on('data', function data(chunk) {
		'use strict';
		pos += chunk.length;

		// `size` should not be 0 here.
		if (size) {
			var percent = (pos / size * 100).toFixed(2);
			sendProgressToRoom(percent,roomName);
		}
	});
	video.pipe(fs.createWriteStream(__dirname + '/video/' + videoName + '.mp4'));
}

function sendProgressToRoom(percent, roomName){
	users.forEach(function(item){
		if(item.roomName == roomName)
			item.emit('videoDownloadProgress', percent);
	});
}

function getConnectedUsersFromRoom(roomName){
	var connectedUsers = [];
	users.forEach(function(item){
		if(item.roomName == roomName)
			connectedUsers.push(item.userName);
	});
	return connectedUsers;
}
