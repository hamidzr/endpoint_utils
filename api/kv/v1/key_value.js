module.exports = app => {

	app.post('/kv/v1/set',(req,res)=>{
		console.log(req.body);
		app.redisC.set([req.body.key,req.body.val]);
		res.status(200).send(req.body);

	});
	app.get('/kv/v1/:key',(req,res)=>{
		app.redisC.get(req.params.key, function(err, reply) {
		    console.log('reply',reply);
		    console.log('err',err);
		    // TODO handle error
		    res.status(200).send(reply);
		});

	})

};