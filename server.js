var express = require("express");
var logger = require("morgan");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");

// Initialize Axios and Cheerio
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

app.use(logger("dev"));
// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://user:password1@ds251618.mlab.com:51618/heroku_f3rpn7nj";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", function(req, res) {
    db.Article.find({saved:false})
    .then(function(result) {
        var hbsObject = {articles:result};
        res.render("all-articles", hbsObject);
    })
    .catch(function(error) {
        res.json(error);
    })
})

app.get("/scrape", function(req, res) {
    axios.get("https://news.ycombinator.com/").then(function(response) {
    var $ = cheerio.load(response.data);
    var results = [];
    $(".title").each(function(i, element) {
        var title = $(element).children("a").text();
        var link = $(element).children("a").attr("href");
        if (title && link && title !== "More") {
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
    res.redirect("/");
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

app.get("/saved", function(req, res) {
    db.Article.find({saved:true}) 
        .populate("note")
        .then(function(result) {
            var hbsObject = {articles:result};
            res.render("saved-articles", hbsObject);
          })
          .catch(function(err) {
            res.json(err);
          });
});

app.post("/save/:id", function(req, res) {
    db.Article.findOneAndUpdate(
      { _id: req.params.id }, 
      { $set: { saved: true }})
    .then(function(dbArticle){
      res.json(dbArticle);
    })
    .catch(function(err){
      res.json(err);
    });
  });

  app.post("/delete/:id", function(req, res) {
    db.Article.findOneAndUpdate(
      { _id: req.params.id }, 
      { $set: { saved: false }})
    .then(function(dbArticle){
      res.json(dbArticle);
    })
    .catch(function(err){
      res.json(err);
    });
  });

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
    db.Article.findOne({ _id: req.params.id })
      .populate("note")
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });
  
  // Route for saving/updating an Article's associated Note
  app.post("/articles/:id", function(req, res) {
    db.Note.create(req.body)
      .then(function(dbNote) {
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });

  app.post("/deletenote/:id", function(req, res) {
      db.Note.findOneAndDelete({_id: req.params.id})
      .then(function(result) {
          res.json(result);
      })
      .catch(function(err) {
          res.json(err);
      })
  });

// Start the server
app.listen(process.env.PORT || PORT, function() {
    console.log("App running on port " + PORT + "!");
});