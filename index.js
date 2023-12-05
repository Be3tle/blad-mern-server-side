const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://blad-donate.web.app'],
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
    const userCollection = client.db('bladDb').collection('users');

    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h',
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized Access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verifyAdmin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Access denied' });
      }
      next();
    };

    const verifyVolunteer = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isVolunteer = user?.role === 'volunteer';
      if (!isVolunteer) {
        return res.status(403).send({ message: 'Access denied' });
      }
      next();
    };
    const verifyDonor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDonor = user?.role === 'donor';
      if (!isDonor) {
        return res.status(403).send({ message: 'Access denied' });
      }
      next();
    };

    //users api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });

    app.get('/users/volunteer/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let volunteer = false;
      if (user) {
        volunteer = user?.role === 'volunteer';
      }
      res.send({ volunteer });
    });

    app.patch(
      '/users/admin/:id',
      verifyToken,

      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: 'admin',
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        res.send(result);
      }
    );

    app.patch('/users/volunteer/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'volunteer',
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.patch('/users/blocked/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'blocked',
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.patch('/users/active/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'active',
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      let query = {};
      if (req.query?.reqEmail) {
        query = { reqEmail: req.query?.reqEmail };
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // donation request api
    app.post('/requests', async (req, res) => {
      const reqItem = req.body;
      const result = await requestCollection.insertOne(reqItem);
      res.send(result);
    });

    app.patch('/requests/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          recName: item.recName,
          recDistrict: item.recDistrict,
          recUpazila: item.recUpazila,
          hospital: item.hospital,
          address: item.address,
          date: item.date,
          time: item.time,
          message: item.message,
        },
      };

      const result = await requestCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get('/requests', async (req, res) => {
      const result = await requestCollection.find().toArray();
      res.send(result);
    });

    app.get('/requests', async (req, res) => {
      console.log('reqEmail:', req.query?.reqEmail);
      let query = {};
      if (req.query?.reqEmail) {
        query = { reqEmail: req.query?.reqEmail };
      }
      console.log('Query:', query);

      try {
        const result = await requestCollection.find(query).toArray();
        console.log('Result:', result);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get('/requests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.findOne(query);
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
