module.exports = app => {
	// caching ? cach headers

	//get all the keys
	app.get('/kv/v1/keys',(req,res)=>{
		// TODO doesn't work
		app.redisC.get("*", function(err, reply) {
			console.log(reply);
		    res.status(200).send(reply);
		});
	});

	//set a key
	app.post('/kv/v1/keys',(req,res)=>{
		console.log(req.body);
		app.redisC.set([req.body.key,req.body.val]);
		res.status(200).send(req.body);
	});

	//delete a key
	app.delete('/kv/v1/keys/:key',(req,res)=>{
		app.redisC.del([req.params.key]);
		res.status(200).send(req.params.key + ' deleted');
	});
	
	//get a value
	app.get('/kv/v1/keys/:key',(req,res)=>{
		app.redisC.get(req.params.key, function(err, reply) {
		    console.log('reply',reply);
		    console.log('err',err);
		    // TODO handle error
		    if (reply === null) {
			    res.status(404).send();
		    }else{
			    res.status(200).send(reply);	    	
		    }
		});
	});


};