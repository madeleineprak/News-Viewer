var express = require("express");
var mongoose = require("mongoose");

// Initialize Axios and Cheerio
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/scrape", function(req, res) {
    axios.get("https://news.ycombinator.com/").then(function(response) {
    var $ = cheerio.load(response.data);
    var results = [];
    $(".title").each(function(i, element) {
        var title = $(element).children("a").text();
        var link = $(element).children("a").attr("href");
        if (title && link) {
        results.push({
            title: title,
            link: link
        });
        }
    });
    console.log(results);
    results.forEach(result => {
        db.Article.create(result)
        .then(function(dbArticle) {
          console.log(dbArticle);
        })
        .catch(function(err) {
          console.log(err);
        });
    })
    // Send a message to the client
    res.send("Scrape Complete");
    });
})

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
    db.Article.find({})
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
});

// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
});