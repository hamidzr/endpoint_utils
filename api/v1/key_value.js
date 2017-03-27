module.exports = app => {

	app.get('/keys',(req,res)=>{
		res.status(200).send(["a","b"]);
	});

};