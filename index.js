/* Copyright G. Hemingway, @2017 */
'use strict';

let path            = require('path'),
    express         = require('express'),
    // session         = require('express-session'),
    logger          = require('morgan'),
    bodyParser      = require('body-parser'),
    mongoose        = require('mongoose'),
    redis			= require('redis');

let port = process.env.PORT ? process.env.PORT : 9000;
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

// Run the server itself
let server = app.listen(port, () => {
    console.log('Example app listening on ' + server.address().port);
});