/* Copyright G. Hemingway, @2017 */
'use strict';

let path            = require('path'),
    express         = require('express'),
    // session         = require('express-session'),
    logger          = require('morgan'),
    bodyParser      = require('body-parser'),
    mongoose        = require('mongoose'),
    http 			= require('http'),
    https 			= require('https'),
    fs 				= require('fs'),
    redis			= require('redis');

let port = process.env.PORT ? process.env.PORT : 9080;
let sslPort = process.env.SSLPORT ? process.env.SSLPORT : 9443;
let env = process.env.NODE_ENV ? process.env.NODE_ENV : 'dev';

/**********************************************************************************************************/

// Setup our Express pipeline
let app = express();
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
}


// Setup pipeline session support
// app.use(session({
//     name: 'session',
//     secret: 'ohhellyes',
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//         path: '/',
//         httpOnly: false,
//         secure: false
//     }
// }));
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
// Connect to mongoBD
// let options = { promiseLibrary: require('bluebird') };
// mongoose.connect('mongodb://localhost:32768/heminggs', options, err => {
//     if (err) console.log(err);
//     else console.log('\t MongoDB connected');
// });

// Import our Data Models
// app.models = {
//     Game: require('./models/game'),
//     User: require('./models/user')
// };

// Import our API Routes
require('./api/kv/v1/key_value')(app);


/**********************************************************************************************************/

// Give them the base page
app.get('*', (req, res) => {
    // res.render('base.pug', {});
    res.status(404).send('resource not found');
});

/**********************************************************************************************************/
//check if we want the secure version or not
if (process.env.CERT) {
	var httpServer = http.createServer(app);
	var httpsServer = https.createServer(sslOptions, app);
	httpServer.listen(port);
	httpsServer.listen(sslPort);
	console.log('listening on ports',port,sslPort);

	app.all('*', function(req, res, next){
	  if (req.secure) {
	    return next();
	  };
	 res.redirect('https://'+req.hostname+':'+app.get(sslPort)+req.url);
	});

}else{
	// Run the regular server, for dev
	let server = app.listen(port, () => {
	    console.log('Example app listening on ' + server.address().port);
	});
}


