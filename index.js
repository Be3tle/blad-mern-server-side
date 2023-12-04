const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.bvbzn4c.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const requestCollection = client.db('bladDb').collection('requests');


// donation request api
    app.post('/requests', async (req, res) => {
      const reqItem = req.body;
      const result = await requestCollection.insertOne(reqItem);
      res.send(result);
    });

    app.get('/requests', async (req, res) => {
      let query = {};
      if (req.query?.reqEmail) {
        query = { reqEmail: req.query?.reqEmail };
      }
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/requests/:id', async (req, res) => {
      const id = req.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Blad is running');
});
app.listen(port, () => {
  console.log(`Blad is listening on port: ${port}`);
});
