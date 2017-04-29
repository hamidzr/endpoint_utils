'use strict';

let path            = require('path'),
	express         = require('express'),
	app 			= express(),
	// session         = require('express-session'),
	logger          = require('morgan'),
	bodyParser      = require('body-parser'),
	mongoose        = require('mongoose'),
	http 			= require('http'),
	https 			= require('https'),
	httpsServer, io,
	httpServer 		= http.Server(app),
	fs 				= require('fs'),
	redis			= require('redis');

let port = process.env.PORT ? process.env.PORT : 9080;
let sslPort = process.env.SSLPORT ? process.env.SSLPORT : 9443;
let env = process.env.NODE_ENV ? process.env.NODE_ENV : 'dev';

/**********************************************************************************************************/

// Setup our Express pipeline
// Setup pipeline logging
if (env !== 'test') app.use(logger('dev'));
// Setup pipeline support for static pages
app.use(express.static(path.join(__dirname, '../../public')));
// Setup pipeline support for server-side templates
app.engine('pug', require('pug').__express);
app.set('views', __dirname);
// Setup redis
app.redisC = redis.createClient();
app.redisC.on('connect', function() {
	console.log('connected to redis client');
});


//setup ssl creds
if (process.env.CERT){
	var sslOptions = {
		key: fs.readFileSync('/etc/letsencrypt/live/gr.itguy.ir/privkey.pem'),
		cert: fs.readFileSync('/etc/letsencrypt/live/gr.itguy.ir/cert.pem')
	};
	httpsServer = https.createServer(sslOptions, app);
	io 				= require('socket.io')(httpsServer);

}else{
	io 				= require('socket.io')(httpServer);

}

// Finish pipeline setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// allow CORS
var allowCrossDomain = function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
}
app.use(allowCrossDomain);


/**********************************************************************************************************/
// Import our API Routes
require('./api/kv/v1/key_value')(app);


app.get('/', (req, res) => {
	// res.render('base.pug', {});
	res.render('base.pug',{});
});


// Give them the base page
// app.get('*', (req, res) => {
//     // res.render('base.pug', {});
//     res.status(404).send('resource not found');
// });

// TODO move this out of here. make this a general websocket server using namespaces and rooms

// ******************** signalling server section  ********
let roomStore = {};
let isRoomInitialized = {}; // can be stored in redis
//helper to get the main room name of a socket
function getRoomName(socket){
	// console.log(Object.keys(socket.rooms));
	return Object.keys(socket.rooms)[1]
}
io.on('connection', socket => {
	console.log('connected: ', socket.id);

	// signalling server listeners
	// add listener for offers and acceptance of offers.

	socket.on('sig:ready', (room) => {
		// store socket-room relationship
		// more memory usage less cpu time
		// needed for handling disconncts and network partitioning
		roomStore[room] = roomStore[room] || [];
		roomStore[room].push(socket.id);
		roomStore[socket.id] = room;

		socket.join(room, () => {
			console.log('user joined room: ',getRoomName(socket));
			// TODO: keep count of connected users to the room
			
			// check if there is an offer and let client know
			// either emit: here is the offer go call
			app.redisC.get(getRoomName(socket), (err, reply) => {
				// TODO handle error
				console.log('reply was ', reply);
				if (reply !== null) {
					let offer = reply;
					socket.emit('sig:offer',offer);
				}else{
					// OR: instruct to generate an offer
					console.log(isRoomInitialized[getRoomName(socket)]);
					if (!isRoomInitialized[getRoomName(socket)]) {
						socket.emit('sig:init');
						isRoomInitialized[getRoomName(socket)] = true;
					};
				};
			}); // end of redis get cb

		}); // end of socket join
	}); // end of on sig:ready


	// when you get an offer send it to others in the room
	socket.on('sig:offer', (offer) => {
		console.log('room ', getRoomName(socket));
		console.log('offer ',offer);
		//keep the offer around
		app.redisC.set(getRoomName(socket),offer);
		socket.broadcast.to(getRoomName(socket)).emit('sig:offer',offer);

	});

	socket.on('sig:accept', (accept) => {
		console.log('room ', getRoomName(socket));
		console.log('accept ',accept);
		socket.broadcast.to(getRoomName(socket)).emit('sig:accept',accept);
	});	

	function resetRoom (socket,roomName) {
		console.log('reseting room: ', roomName);
		if (roomName) {
			app.redisC.del([roomName]);
			isRoomInitialized[roomName] = false;
		};
	}

	socket.on('sig:reset', () => {
		resetRoom(socket,roomStore[socket.id]);
	});	

	socket.on('disconnect', function() {
		console.log('user disconnected',socket.id);
		// call sig:reset
		resetRoom(socket,roomStore[socket.id]);
	});
});


/**********************************************************************************************************/
//check if we want the secure version or not
if (process.env.CERT) {
	// httpServer.listen(port);
	httpsServer.listen(sslPort);
	console.log('listening on ports',sslPort);

	app.all('*', function(req, res, next){
		if (req.secure) {
		return next();
		};
		res.redirect('https://'+req.hostname+':'+app.get(sslPort)+req.url);
	});

}else{
	// Run the regular server, for dev
	let server = httpServer.listen(port, () => {
		console.log('Example app listening on ' + server.address().port);
	});
}


