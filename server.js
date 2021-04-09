'use strict';

require('dotenv').config()

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;
const methodOverRide = require('method-override');
const { request } = require('express');

// Application Setup
const app = express();
const PORT = process.env.PORT || 3030;

// overcome heroku ssl issue
const options = NODE_ENV === 'production' ? { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } } : { connectionString: DATABASE_URL };

// Application Middleware
app.use(express.urlencoded({ extended: true })); // we use it when there is a complex object in json data (nested things)
app.use(express.static('public')); // automatically creates routs for us based on the files in the folders 
app.use(methodOverRide('_method')); // to have PUT and DELETE methods in the form

// Database Setup
const client = new pg.Client(options);

// client.connect();
client.on('error', err => console.log(err));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
// Test Route
app.get('/hello', renderHomePage);

// Renders the home page
app.get('/', renderHomePage);

// Renders the search form
app.get('/searches/new', showForm);

//show book detail
app.get('/books/:id', getOne);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

//add book to the list
app.post('/books', addToList);

//edit book
app.get('/edit/:id', editOne);

//apply edit
app.put('/update/:id', update);

//delete book
app.delete('/delete/:id', deleteBook);

// bad request 
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

//listen
client.connect().then(() =>{
    app.listen(PORT, ()=>{
        console.log(`App is listening on port ${PORT}`);
    })
});

//Constructor function
function Book(volumeInfo) {
    const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
    volumeInfo.imageLinks != undefined ? this.image_url = volumeInfo.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://')
        : this.image_url = placeholderImage;
    this.title = volumeInfo.title || 'No title available';
    this.author = volumeInfo.authors || 'No Author information available';
    this.description = volumeInfo.description || 'No description available';
    volumeInfo.industryIdentifiers ? this.isbn = volumeInfo.industryIdentifiers[0].identifier: 'ISBN unavailable';
}

// homepage
function renderHomePage(request, response) {
    const SQL = 'SELECT * FROM books;';
    return client.query(SQL)
    .then(result => response.render('pages/index', {books: result.rows}))
    .catch((error)=> handleError(error, response));
};

//search form
function showForm(request, response) {
    response.render('pages/searches/new.ejs');
};

//search result
function createSearch(request, response) {
    let url = 'https://www.googleapis.com/books/v1/volumes?q=';

    request.body.search[1] === 'title' ? url += `+intitle:${request.body.search[0]}` : request.body.search[1] === 'author' ? url += `+inauthor:${request.body.search[0]}` : console.log('Not working');
    superagent.get(url)
        .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
        .then(results => response.render('pages/searches/show', { searchResults: results }))
        .catch((error) => handleError(error, response));
}

//book detail function
function getOne(request, response){
    let sql = 'SELECT * FROM books WHERE id=$1;'
    let values = [request.params.id];
    return client.query(sql, values)
    .then(result =>{
        return response.render('pages/books/show', {book: result.rows[0]})
    }).catch(error =>handleError(error, response))
};
    
// add book function
function addToList(request, response){
    const book = request.body;
    const sql = 'INSERT INTO books (title, description, image_url, author, isbn) VALUES ($1, $2, $3, $4, $5) RETURNING id;';
    const values = [book.title, book.description, book.image_url, book.author, book.isbn];
    client.query(sql, values)
    .then(result =>{
        response.redirect(`/books/${result.rows[0].id}`);
    }).catch(error=>handleError(error, response));
}

//Edit book function
function editOne(request, response){
    const sql = 'SELECT * FROM books WHERE id=$1;';
    const values = [request.params.id];
    client.query(sql, values)
    .then(results=>{
        response.render('pages/books/edit', {book: results.rows[0]})
    })
    .catch(error=>handleError(error, response));
}

//apply edit function
function update(request, response){
    const sql ='UPDATE books SET title=$1,author=$2,description=$3,isbn=$4 WHERE id=$5;';
    const values = [request.body.title, request.body.author, request.body.description, request.body.isbn, request.params.id];
    client.query(sql, values)
    .then(()=> response.redirect(`/books/${request.params.id}`))
    .catch(error=> handleError(error, response))
};

//delete book function
function deleteBook(request, response){
    const sql = 'DELETE FROM books WHERE id=$1;';
    const value = [request.params.id];
    client.query(sql, value)
    .then(()=>response.redirect('/'))
    .catch(error => handleError(error, response));
}

//error handler 
function handleError (error, response) {
    response.render('pages/error', {error:'Something Went Wrong'});
    console.log(error);
};