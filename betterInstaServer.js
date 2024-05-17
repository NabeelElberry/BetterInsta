const express = require("express");
const fs = require("fs");
const http = require('http');
const path = require("path");
const axios = require('axios');
const bodyParser = require("body-parser");
const app = express();

process.stdin.setEncoding("utf8")

if (process.argv.length !== 3) {
    process.stdout.write("Usage supermarketServer.js jsonFile");
    process.exit(1);
}

console.log(`Web server started and running at http://localhost:${process.argv[2]}`);

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput != null) {
        const userInput = dataInput.trim();
        if (userInput === "stop") {
            process.stdout.write("Shutting down the server\n");
            process.exit(0);
        } else {
            process.stdout.write("Invalid command: " + userInput + "\n");
        }

        process.stdout.write(prompt);
        process.stdin.resume();
    }
})

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));

/* view/templating engine */
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended:false}));

require("dotenv").config({ path: path.resolve(__dirname, '.env') })  

const uri = process.env.MONGO_CONNECTION_STRING;

 /* Our database and collection */
 const databaseAndCollection = {db: "CMSC335DB", collection:"instaUsers"};

/****** DO NOT MODIFY FROM THIS POINT ONE ******/
const { MongoClient, ServerApiVersion } = require('mongodb');

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function insertUser(client, databaseAndCollection, newUser) {
    await client.connect();

    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newUser);

    console.log(`Movie entry created with id ${result.insertedId}`);
}

class Table {
    #table;

    constructor() {
        this.#table = "<table border=1><tr><th>Name</th><th>GPA</th></tr>";
    }

    add(name, gpa) {
        this.#table += `<tr><td>${name}</td><td>${gpa}</td></tr>`;
    }
    close() {
        this.#table += "</table>";
    }

    get getTable() {
        return this.#table;
    }
}

async function deleteAllEntries(client, databaseAndCollection) { 
    const result = await client.db(databaseAndCollection.db) 
    .collection(databaseAndCollection.collection) 
    .deleteMany({}); 
       
    return result.deletedCount 
} 
async function lookUpOneEntry(client, databaseAndCollection, email) {
    await client.connect();

    let filter = {email: email};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);

   if (result) {
       console.log(result.name);
   } else {
       console.log(`No movie found with name ${movieName}`);
   }

   return result;
}

async function lookUpMany(client, databaseAndCollection) {
    let filter = {};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);

    const result = await cursor.toArray();
    

    return result;
}

app.get("/",(request, response) => {
    response.render("index");
});

app.get('/search', (req, res) => {
    const num = process.argv[2];

    res.render('searchInput', {num});
});


app.post('/searchProcess', async (req, res) => {
    const user = req.body.username;

    const options = {
        method: 'GET',
        url: 'https://instagram-scraper-2022.p.rapidapi.com/ig/info_username/',
        params: {
          user: user
        },
        headers: {
          'X-RapidAPI-Key': 'd550ca3806mshca129faafbafd37p17d710jsna81029d1c1cf',
          'X-RapidAPI-Host': 'instagram-scraper-2022.p.rapidapi.com'
        }
      };
   

    const userInfo = await axios.request(options);

    const following = userInfo.data.user.following_count;
    const followers = userInfo.data.user.follower_count;
    const full_name = userInfo.data.user.full_name;
    const profile_url = userInfo.data.user.profile_pic_url;
    const description = userInfo.data.user.biography;


    const newUser = {username: user, followers: followers, following: following};

    const username = user;

    await insertUser(client, databaseAndCollection, newUser);

    res.render("processSearch", {profile_url, username, full_name, followers, following, description});
});

app.get("/searchHistory", async (request, response) => {
    const result = await lookUpMany(client, databaseAndCollection, 0);

    let table = "<table border=1><tr><th>Username</th><th>Followers</th><th>Following</th></tr>";

    result.forEach((x) => {
        table += "<tr><td>" + x.username + "</td><td>" + x.followers + "</td><td>" + x.following + "</td></tr>";
    })

    table += "</table>";
    response.render("searchHistory", {table})

})

app.get("/removeHistory", async(request,response) => {
    await deleteAllEntries(client, databaseAndCollection, 0);
    response.render("removeHistory")
})

app.get("/followCount", (request, response) => {
    response.render("followCount");
});

app.post("/followCount", async (request, response) => {
    let minFollwers = parseFloat(request.body.followers);
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find({ $expr: { $gte: ["$follwers", minFollwers] } });

    const result = await cursor.toArray();
    let table = new Table();
    result.forEach(app => {
        table.add(app.username, app.followers);
    });
    table.close();
    response.render("processFollowCount", {table: table.getTable});
});

app.listen(process.argv[2]); 