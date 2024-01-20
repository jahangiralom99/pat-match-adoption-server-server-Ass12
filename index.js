const express = require("express");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const cors = require("cors");

// middleware
app.use(cors());

// body pars
app.use(express.json());

console.log();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e9wqxpd.mongodb.net/?retryWrites=true&w=majority`;

//  MongoClient  server configuration
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //   user Collections
    const petsCollection = client.db("petAdoptionDb").collection("allPets");
    const usersCollection = client.db("petAdoptionDb").collection("users");

    await client.connect();

    // get ALl Pests and also query for category data
    app.get("/api/v1/all-pets", async (req, res) => {
      //   query by category
      const category = req.query.category;
      const name = req.query.name;
      let queryObj = {};
      if (category) {
        queryObj.category = category;
      }
      if (name) {
        queryObj.name = { $regex: new RegExp(name, 'i') };
      }
      const result = await petsCollection.find(queryObj).sort({date : "desc"}).toArray();
      res.send(result);
    });

    // get by id
      app.get("/api/v1/all-pets/:id", async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await petsCollection.findOne(query);
          res.send(result);
      });
    

    // user create data for user not 
    app.post("/api/v1/users", async (req, res) => {
      const user = req.body;
      // email query:
      const query = { email: user.email };
      const isExisting = await usersCollection.findOne(query);
      if (isExisting) {
        return res.send({
          message: "this user is already exists",
          insertedId: null,
        })
      };
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    


    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("welcome to pet server");
});

app.listen(port, () => {
  console.log(`listen on port ${port}`);
});
