'use strict';

let path            = require('path'),
	express         = require('express'),
	app 			= express(),
	logger          = require('morgan'),
	bodyParser      = require('body-parser'),
	mongoose        = require('mongoose'),
	http 			= require('http'),
	https 			= require('https'),
	httpsServer, io,
	httpServer 		= http.Server(app),
	fs 				= require('fs'),
	{ Etcd }		= require('node-etcd3'),
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
// setup etcd
let etcd = new Etcd();

//setup ssl creds
if (process.env.CERT_DIR){
	var sslOptions = {
		// '/etc/letsencrypt/live/gr.itguy.ir'
		key: fs.readFileSync(process.env.CERT_DIR + '/privkey.pem'),
		cert: fs.readFileSync(process.env.CERT_DIR + '/cert.pem')
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

// TODO move this out of here. make this a general websocket server using namespaces and rooms

// ******************** signalling server section  ********
let roomStore = {};
let isRoomInitialized = {}; // can be stored in redis
//helper to get the main room name of a socket
function getRoomName(socket){
	// console.log(Object.keys(socket.rooms));
	// return Object.keys(socket.rooms)[1]
	return roomStore[socket.id]
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

			etcd.get(getRoomName(socket)).then(value => {
				// TODO handle error
				// value = value.node ? value.node.value : null;
				if (value !== null) {
					let offer = value;
					socket.emit('sig:offer',offer);
				}else{
					// OR: instruct to generate an offer
					console.log(isRoomInitialized[getRoomName(socket)]);
					//lock the room
					if (!isRoomInitialized[getRoomName(socket)]) {
						socket.emit('sig:init');
						isRoomInitialized[getRoomName(socket)] = true;
					};
				};
			}); // end of get cb

		}); // end of socket join
	}); // end of on sig:ready


	// when you get an offer send it to others in the room
	socket.on('sig:offer', (offer) => {
		console.log('offer received for room: ', getRoomName(socket), 'from socket ', socket.id);
		//keep the offer around
		etcd.set(getRoomName(socket), offer);
		socket.broadcast.to(getRoomName(socket)).emit('sig:offer',offer);

	});

	socket.on('sig:accept', (accept) => {
		console.log('accept received for room: ', getRoomName(socket), 'from socket ', socket.id);
		socket.broadcast.to(getRoomName(socket)).emit('sig:accept',accept);
	});	

	function resetRoom (socket,roomName) {
		console.log('reseting room: ', roomName);
		if (roomName) {
			etcd.delete([roomName]);
			isRoomInitialized[roomName] = false;
		};
	}

	socket.on('sig:reset', () => {
		resetRoom(socket,roomStore[socket.id]);
	});	

	socket.on('disconnect', function() {
		console.log('user disconnected',socket.id);
		resetRoom(socket,roomStore[socket.id]);
	});
});


/**********************************************************************************************************/
//check if we want the secure version or not
if (process.env.CERT_DIR) {
	// httpServer.listen(port);
	httpsServer.listen(sslPort);
	console.log('listening on ports',sslPort);

}else{
	// Run the regular server, for dev
	let server = httpServer.listen(port, () => {
		console.log('Example app listening on ' + server.address().port);
	});
}


