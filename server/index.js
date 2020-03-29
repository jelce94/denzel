const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const {PORT} = require('./constants');
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;

const imdb = require('./imdb');
const DENZEL_IMDB_ID = 'nm0000243';
const METASCORE = 70;

const CONNECTION_URL = "mongodb+srv://jelce:test@cluster0-ht2ri.mongodb.net/test?retryWrites=true&w=majority";
const DATABASE_NAME = "jelce";

const graphqlHTTP = require('express-graphql');
const { GraphQLSchema } = require('graphql');
const _ = require('lodash');

const app = express();

module.exports = app;

app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

app.options('*', cors());

/*app.get('/', (request, response) => {
  response.send({'ack': true});
});*/

/* Connection with the mongodb database */

var database, collection, data;

app.listen(PORT, () => {
    MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true}, (error, client) => {
        if(error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("movies");
        console.log("Connected to `" + DATABASE_NAME + "`!");
    });
});

/* Populate the database with all the Denzel's movies from IMDb */

async function count_() {
	let c = 0;
	await collection.countDocuments().then((count) => {
		c = count;
	});
	return c;
}

app.get("/movies/populate/:id", async (request, response) => {
		var count = await count_();
		if(count >= 58)
		{
			console.log('Database is fulled!');
			reponse.send('Database is fulled');
		}
		else
		{
			let _id = request.params.id;
			//console.log(_id);
			const moviesDenzel = await imdb(_id);
			collection.insert(moviesDenzel, (error, result) => {
        	if(error) {
            	return response.status(500).send(error);
        	}
        	response.send(moviesDenzel.length + ' films has been implemented');
    	});
		}
});

/* Fetch a random must-watch movie */

app.get("/movies", (request, response) => {
    collection.find({ metascore : {$gte : 70} }).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        let random = Math.floor(Math.random() * Math.floor(result.length));
        response.send(result[random]);
    });
});

/* Fetch a specific movie */

app.get("/movies/:id", (request, response) => {
    collection.findOne({ "id": request.params.id }, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
});

/* Search for Denzel's movies.

This endpoint accepts the following optional query string parameters:

limit - number of movies to return (default: 5)
metascore - filter by metascore (default: 0)
The results array should be sorted by metascore in descending way.

*/

app.get('/movies/search', (request, response) => {
	let metascore = 70;
	let limit = 5;
	if (request.query['limit'] != null && Number(request.query.limit) <= 5) limit = Number(request.query.limit);
	collection.aggregate([
                     { $match: { metascore: { $gte: 70} } },
                     { $sort: { metascore: -1 } }
                   ]).toArray((error, result) => {
		if (error) {
			return response.status(500).send(error);
		}
		var res = [];
		for (let i = 0; i < limit; i++) {
			if (result[i] != null) res.push(result[i]);
		}
		response.send(res);
	});
});

/* Save a watched date and a review.

This endpoint accepts the following post parameters:
date - he watched date
review - the personal review
*/

app.post('/movies/:id', (request, response) => {
	collection.updateOne({ id: request.params.id }, { $set: request.body }, (error, result) => {
		if (error) {
			return response.status(500).send(error);
		}
		response.send(result);
	});
});



console.log(`📡 Running on port ${PORT}`);
