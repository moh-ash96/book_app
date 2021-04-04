'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');

// Application Setup
const app = express();
const PORT = process.env.PORT || 3030;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
// Test Route
app.get('/hello', renderHomePage);
// Renders the home page
app.get('/', renderHomePage);

// Renders the search form
app.get('/searches/new', showForm);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);


// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// HELPER FUNCTIONS
// Only show part of this to get students started
function Book(volumeInfo) {
    const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
    volumeInfo.imageLinks != undefined ? this.image = volumeInfo.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://')
        : this.image = placeholderImage;
    this.title = volumeInfo.title || 'No title available'; // shortcircuit
    this.author = volumeInfo.authors || 'No Author information available';
    this.description = volumeInfo.description || 'No description available';
}






// Note that .ejs file extension is not required

function renderHomePage(request, response) {
    response.render('pages/index')
}

function showForm(request, response) {
    response.render('pages/searches/new.ejs');
}

// No API key required
// Console.log request.body and request.body.search
function createSearch(request, response) {
    let url = 'https://www.googleapis.com/books/v1/volumes?q=';

    console.log(request.body);
    console.log(request.body.search);


    // can we convert this to ternary?
    request.body.search[1] === 'title' ? url += `+intitle:${request.body.search[0]}` : request.body.search[1] === 'author' ? url += `+inauthor:${request.body.search[0]}` : console.log('Not working');

    superagent.get(url)
        .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
        .then(results => response.render('pages/searches/show', { searchResults: results }))
        // how will we handle errors?
        .catch((error) => {
            console.log(error)
            console.log();
        });

}