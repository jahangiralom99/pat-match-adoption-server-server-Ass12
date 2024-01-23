const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY_API);

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
    const donationPetsCollection = client.db("petAdoptionDb").collection("donationPets");
    const adoptionsCollection = client.db("petAdoptionDb").collection("adoptions");
    const paymentsCollection = client.db("petAdoptionDb").collection("payments");

    await client.connect();

    // jwt relate api jwt Token Post
    app.post("/api/v1/create-jwt-token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN_KEY, {
        expiresIn: 60 * 60,
      });
      res.send({ token });
    });

    // Verify JWT token
    const verifyToken = async (req, res, next) => {
      if (!req.headers.authorization) {
        res.status(401).send({ message: "unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_TOKEN_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify Admin 
    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      console.log(req.decoded);
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        res.status(403).send({message : 'forbidden access'})
      };
      next();
    }

    // get ALl Pests and also query for category data
    app.get("/api/v1/all-pets",  async (req, res) => {
      //   query by category
      const category = req.query.category;
      const name = req.query.name;
      let queryObj = {};
      if (category) {
        queryObj.category = category;
      }
      if (name) {
        queryObj.name = { $regex: new RegExp(name, "i") };
      }
      const result = await petsCollection
        .find(queryObj)
        .sort({ date: "desc" })
        .toArray();
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
        });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // user get 
    app.get("/api/v1/users", verifyToken,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // check admin users----------------------
    app.get("/api/v1/user-admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      };
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin"
      };
      res.send({ admin })
    });

    // user update TO admin for Id----------------------
    app.patch("/api/v1/users-update/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const upDate = {
        $set: {
          role: 'admin',
        },
      };
      const result = await usersCollection.updateOne(filter, upDate);
      res.send(result);
    });

    // Deleted Users
    app.delete("/api/v1/users-deleted/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    } )

    // get  Donation pets 
    app.get("/api/v1/all-donate-pets", async (req, res) => {
      const result = await donationPetsCollection.find().sort({date: "desc"}).toArray();
      res.send(result);
    });

    // get by Single ID data
    app.get("/api/v1/all-donate-pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationPetsCollection.findOne(query);
      res.send(result);
    });

    // Adoption Pet create :
    app.post("/api/v1/add-Adoptions", async (req, res, next) => {
      const user = req.body;
      const result = await adoptionsCollection.insertOne(user);
      res.send(result);
    });

    // stripe Payment api 
    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
      });

      res.send({
        clientSecret : paymentIntent.client_secret,
      })
    })

    // post payment info : 
    app.post("/api/v1/create-payment-info", async (req, res) => {
      const paymentInfo = req.body;
      const result = await paymentsCollection.insertOne(paymentInfo);
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
