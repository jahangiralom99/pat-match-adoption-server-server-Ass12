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
    const photosCollection = client.db("petAdoptionDb").collection("photos");
    const usersCollection = client.db("petAdoptionDb").collection("users");
    const donationPetsCollection = client
      .db("petAdoptionDb")
      .collection("donationPets");
    const adoptionsCollection = client
      .db("petAdoptionDb")
      .collection("adoptions");
    const paymentsCollection = client
      .db("petAdoptionDb")
      .collection("payments");

    // await client.connect();

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
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //  -----------Gallery -----------
    app.get("/api/v1/gallery", async (req, res) => {
      const result = await photosCollection.find().toArray();
      res.send(result);
    })


    // ---------------------------PetCollection  Works Start--------------------------

    // get ALl Pests and also query for category data
    app.get("/api/v1/all-pets", async (req, res) => {
      //   query by category
      const category = req.query.category;
      const name = req.query.name;
      const email = req.query.email;
      const adopted = req.query.adopted;

      let queryObj = {};
      if (category) {
        queryObj.category = category;
      }
      if (name) {
        queryObj.name = { $regex: new RegExp(name, "i") };
      }
      if (email) {
        queryObj.email = email;
      }
      if (adopted) {
        queryObj.adopted = adopted;
      }

      const result = await petsCollection
        .find(queryObj)
        .sort({ date: "desc" })
        .toArray();
      res.send(result);
    });

    // get by adoption false data
    app.get("/api/v1/all-pet-adoption", async (req, res) => {
      const email = req.query.email;
      const result = await petsCollection
        .find({ email: email, adopted: false })
        .toArray();
      res.send(result);
    });

    // Add Pet only Admin can Do this
    app.post(
      "/api/v1/add-petList",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const petInfo = req.body;
        const result = await petsCollection.insertOne(petInfo);
        res.send(result);
      }
    );

    //  add post for Normal user
    app.post("/api/v1/add-petList-user", async (req, res) => {
      const petInfo = req.body;
      const result = await petsCollection.insertOne(petInfo);
      res.send(result);
    });

    // update admin pet collection
    app.patch(
      "/api/v1/update-pet/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const petInfo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateInfo = {
          $set: {
            category: petInfo.category,
            name: petInfo.name,
            age: petInfo.age,
            location: petInfo.location,
            petBio: petInfo.petBio,
            description: petInfo.description,
            gender: petInfo.gender,
            color: petInfo.color,
            size: petInfo.size,
            vaccinated: petInfo.vaccinated,
            date: petInfo.date,
            image: petInfo.image,
            blog_img: petInfo.image,
          },
        };
        const result = await petsCollection.updateOne(filter, updateInfo);
        res.send(result);
      }
    );

    // update User  pet collection
    app.patch("/api/v1/update-pet-user/:id", async (req, res) => {
      const id = req.params.id;
      const petInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateInfo = {
        $set: {
          category: petInfo.category,
          name: petInfo.name,
          age: petInfo.age,
          location: petInfo.location,
          petBio: petInfo.petBio,
          description: petInfo.description,
          gender: petInfo.gender,
          color: petInfo.color,
          size: petInfo.size,
          vaccinated: petInfo.vaccinated,
          date: petInfo.date,
          image: petInfo.image,
          blog_img: petInfo.image,
        },
      };
      const result = await petsCollection.updateOne(filter, updateInfo);
      res.send(result);
    });

    // update Adoption status just For user ;
    app.patch("/api/v1/pet-adoption-update/:id", async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          adopted: info.adopted,
        },
      };
      const result = await petsCollection.updateOne(filter, update);
      res.send(result);
    });

    // delete for user
    app.delete("/api/v1/pet-deleted-user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    });

    // Pet collection Delete for admin
    app.delete(
      "/api/v1/pet-deleted/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await petsCollection.deleteOne(query);
        res.send(result);
      }
    );

    // get by id
    app.get("/api/v1/all-pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    // ---------------------------PetCollection  Works End---------------------------

    // ---------------------------UserCollection  Works Start---------------------------
    // user create data for user
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
    app.get("/api/v1/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // check admin users----------------------
    app.get("/api/v1/user-admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // user update TO admin for Id----------------------
    app.patch(
      "/api/v1/users-update/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const upDate = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, upDate);
        res.send(result);
      }
    );

    // Deleted Users
    app.delete(
      "/api/v1/users-deleted/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      }
    );
    // ---------------------------UserCollection  Works End---------------------------

    // ----------------------------donateCollection Works Start-----------------------
    app.post("/api/v1/create-donation-pet", async (req, res) => {
      const info = req.body;
      const result = await donationPetsCollection.insertOne(info);
      res.send(result);
    });

    // get  Donation pets
    app.get("/api/v1/all-donate-pets", async (req, res) => {
      const email = req.query.email;
      let obj = {}
      if (email) {
        obj.email = email
      }
      const result = await donationPetsCollection
        .find(obj)
        .sort({ date: "desc" })
        .toArray();
      res.send(result);
    });

    // get All Donation pets for admin
    app.get("/api/v1/all-donate-pets-admin",verifyToken, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      let obj = {}
      if (email) {
        obj.email = email
      }
      const result = await donationPetsCollection
        .find(obj)
        .sort({ date: "desc" })
        .toArray();
      res.send(result);
    });

     // update admin Donation  collection
     app.patch("/api/v1/donation-update-pet/:id",verifyToken, verifyAdmin, async (req, res) => {
       const id = req.params.id;
       console.log(id);
        const petInfo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateInfo = {
          $set: {
            category: petInfo.category,
            name: petInfo.name,
            age: petInfo.age,
            location: petInfo.location,
            petBio: petInfo.petBio,
            description: petInfo.description,
            gender: petInfo.gender,
            color: petInfo.color,
            size: petInfo.size,
            vaccinated: petInfo.vaccinated,
            date: petInfo.date,
            image: petInfo.image,
            blog_img: petInfo.image,
            amount: petInfo.amount,
            maximum_donation: petInfo.maximum_donation
          },
        };
        const result = await donationPetsCollection.updateOne(filter, updateInfo);
        res.send(result);
      }
    );
     // update admin Donation  collection
     app.patch("/api/v1/donation-update-pet-byUser/:id", async (req, res) => {
       const id = req.params.id;
       console.log(id);
        const petInfo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateInfo = {
          $set: {
            category: petInfo.category,
            name: petInfo.name,
            age: petInfo.age,
            location: petInfo.location,
            petBio: petInfo.petBio,
            description: petInfo.description,
            gender: petInfo.gender,
            color: petInfo.color,
            size: petInfo.size,
            vaccinated: petInfo.vaccinated,
            date: petInfo.date,
            image: petInfo.image,
            blog_img: petInfo.image,
            amount: petInfo.amount,
            maximum_donation: petInfo.maximum_donation
          },
        };
        const result = await donationPetsCollection.updateOne(filter, updateInfo);
        res.send(result);
      }
    );

    // get by id for admin
    app.get("/api/v1/donation-getBy/:id",verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationPetsCollection.findOne(query);
      res.send(result);
    })

    // Paused update Donation admin change this 
    app.patch("/api/v1/donation-pet-pause/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donate: updateInfo.donate,
        }
      };
      const result = await donationPetsCollection.updateOne(filter, update);
      res.send(result);
    });

    // Paused update Donation User  change this 
    app.patch("/api/v1/donation-pet-pause-user/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donate: updateInfo.donate,
        }
      };
      const result = await donationPetsCollection.updateOne(filter, update);
      res.send(result);
    });

    // UnPaused update Donation admin change this 
    app.patch("/api/v1/donation-pet-Unpause/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donate: updateInfo.donate,
        }
      };
      const result = await donationPetsCollection.updateOne(filter, update);
      res.send(result);
    });

    // UnPaused update Donation User-- change this 
    app.patch("/api/v1/donation-pet-Unpause-user/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donate: updateInfo.donate,
        }
      };
      const result = await donationPetsCollection.updateOne(filter, update);
      res.send(result);
    })

    // donations pet delete for admin;
    app.delete("/api/v1/donation-pet-delete/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationPetsCollection.deleteOne(query);
      res.send(result);
    });
    // donations pet delete for User;
    app.delete("/api/v1/donation-pet-delete-user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationPetsCollection.deleteOne(query);
      res.send(result);
    });

    // get by Single ID data for user 
    app.get("/api/v1/all-donate-pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationPetsCollection.findOne(query);
      res.send(result);
    });


    // ---------------------------End Donate ----------------------


    // -------------------Start Adoption Collection Start------------------------
    // Adoption Pet create for user:
    app.post("/api/v1/add-Adoptions", async (req, res, next) => {
      const user = req.body;
      const result = await adoptionsCollection.insertOne(user);
      res.send(result);
    });

    // Get Adoption for user;
    app.get("/api/v1/pet-adoption", async (req, res) => {
      const email = req.query.email;
      const result = await adoptionsCollection
        .find({ email: email })
        .toArray();
      res.send(result);
    });

    // -----------------end Adoption Collection----------------


    // ------------------start payment collection----------------
    // stripe Payment api
    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // post payment info :
    app.post("/api/v1/create-payment-info", async (req, res) => {
      const paymentInfo = req.body;
      const result = await paymentsCollection.insertOne(paymentInfo);
      res.send(result);
    });

    app.get("/api/v1/payment-collection", async (req, res) => {
      const email = req.query.email;
      const obj = {};
       if (email) {
        obj.email = email
      }
      const result = await paymentsCollection.find(obj).toArray();
      res.send(result);
    })
    // -------------------------------------
    app.get("/api/v1/stats", async (req, res) => {
      const user = await usersCollection.estimatedDocumentCount();
      const donation = await donationPetsCollection.estimatedDocumentCount();
      const petCollection = await petsCollection.estimatedDocumentCount();
      res.send({
        user, donation, petCollection
      })
    })
    //---------------------------------------------------------


    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );


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
