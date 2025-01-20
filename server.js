const express = require('express');
const mongoose = require('mongoose');
const validation = require('express-validator')
const fileUpload = require('express-fileupload');
const session = require('express-session');
const path = require('path');

const app = express();
app.set('views', path.join(__dirname,'views'));
app.use(express.static(__dirname+'/public'));
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));
app.set('view engine','ejs');
app.use(fileUpload());
app.use(express.urlencoded({extended:false}));
const {check,validationResult}=require('express-validator');

app.use(session({
    secret:'secret',
    resave:false,
    saveUninitialized:true
}));

mongoose.connect('');

const User= mongoose.model('user',{
    uname:String,
    pwd:String,
});
const Page = mongoose.model('page',{
    title:String,
    slug: { type: String, unique: true },
    img:String,
    tar:String
})



app.get('/', async (req, res) => {
    try {
        const pages = await Page.find(); // Fetch all pages
        res.render('home', { logname: req.session.user, pages: pages }); // Pass pages to the view
    } catch (err) {
        console.log('Error fetching pages:', err);
        res.send('Error loading homepage');
    }
});


// Login route
app.get('/login', async (req, res) => {
    try {
        const pages = await Page.find(); // Fetch all pages
        res.render('login', { logname: req.session.user, pages: pages }); // Pass pages to the view
    } catch (err) {
        console.log('Error fetching pages:', err);
        res.send('Error loading login');
    }
});


app.get('/addpage', async (req, res) => {
    try {
        const pages = await Page.find();
        res.render('addpage', { data: null, logname: req.session.user, pages: pages });
    } catch (err) {
        console.log('Error fetching pages for nav:', err);
        res.render('addpage', { data: null, logname: req.session.user, pages: [] });
    }
});

app.get('/home', async (req, res) => {
    try {
        const pages = await Page.find(); // Fetch all pages
        res.render('home', { logname: req.session.user, pages: pages }); // Pass pages to the home view
    } catch (err) {
        console.log('Error fetching pages:', err);
        res.render('home', { logname: req.session.user, pages: [] }); // Empty array on error
    }
});


// Login POST route
app.post('/login', [
    check('uname', 'Invalid Username').not().isEmpty(),
    check('pwd', 'Invalid Password').not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const pages = await Page.find();
        res.render('login', {errors: errors.array(), pages: pages});
    } else {
        try {
            const data = await User.findOne({ uname: req.body.uname });
            if (data && data.uname === req.body.uname && data.pwd === req.body.pwd) {
                req.session.user = data.uname;
                req.session.logged = true;
                req.session.data = data;
                
                req.session.heading = 'Welcome';
                req.session.message = 'Hello Admin, Welcome to the Dashboard!'

                res.redirect('/admin');
            } else {
                console.log(errors.array());
                const pages = await Page.find();
                res.render('login',{errors:[{path:"LOGERR",msg:"Invalid User Name/Password"}], pages: pages});
            }
        } catch (error) {
            console.log(error);
        }
    }
});

// Logout route
app.get('/logout',async (req, res) => {

    
    res.redirect('/home');
    req.session.destroy();
});


// Edit page list route
app.get('/editpage', async (req, res) => {
    try {
        const pages = await Page.find(); // Fetch all pages from the database
        res.render('editpage', { pages: pages, logname: req.session.user }); // Pass pages to the view
    } catch (err) {
        console.log('Error fetching pages:', err);
        res.render('editpage', { pages: [], logname: req.session.user }); // Pass an empty array on error
    }
});

// Edit page route
app.get('/editpage/:slug', async (req, res) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug }); // Fetch page by ID
        if (page) {
            res.render('addpage', { data: page, logname: req.session.user }); // Pass the page data to the addpage view
        } else {
            console.log('Page not found');
            res.redirect('/editpage');
        }
    } catch (err) {
        console.log('Error fetching page:', err);
        res.redirect('/editpage');
    }
});

// Add page POST route
app.post('/addpage', async (req, res) => {
    try {
        let imPath2 = '';
        if (req.files && req.files.file){
        const imName = req.files.file.name;
        const imPath = 'public/images/uploads/' + imName;
        imPath2 = 'images/uploads/' + imName;
        const im = req.files.file;

        // Move the uploaded file to the destination
        im.mv(imPath, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("File uploaded successfully");
            }
        });
    }
        let slug =  req.body.slug || req.body.ptitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        // Save the new page to the database
        const newPage = new Page({
            title: req.body.ptitle,
            slug: slug,
            img: imPath2,
            tar: req.body.tar,
        });

        await newPage.save();
        req.session.heading = 'Page Added';
        req.session.message = `Successfully added the page: "${req.body.ptitle}"`;
        res.redirect('/admin');
    } catch (err) {
        console.log('Error adding page:', err);
        req.session.heading = 'Error';
        req.session.message = 'Failed to add the page.';
        res.redirect('/admin');
    }
});

// Update page POST route
app.post('/updatepage/:slug', async (req, res) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug });

        if (page) {
            page.title = req.body.ptitle;
            page.slug = req.body.slug || req.body.ptitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            page.tar = req.body.tar;

            if (req.files && req.files.file) {
                const imName = req.files.file.name;
                const imPath = 'public/images/uploads/' + imName;
                const imPath2 = 'images/uploads/' + imName;

                const im = req.files.file;
                im.mv(imPath, (err) => {
                    if (!err) {
                        console.log("File uploaded successfully");
                        page.img = imPath2;
                    } else {
                        console.log(err);
                    }
                });
            }

            await page.save();

            req.session.heading = 'Page Updated';
            req.session.message = `Successfully updated the page: "${req.body.ptitle}"`;
            res.redirect('/admin');
        } else {
            req.session.heading = 'Error';
            req.session.message = 'Page not found.';
            res.redirect('/admin');
        }
    } catch (err) {
        console.log('Error updating page:', err);
        req.session.heading = 'Error';
        req.session.message = 'Failed to update the page.';
        res.redirect('/admin');
    }
});

app.get('/deletepage/:slug', async (req, res) => {
    try {
        const page = await Page.findOneAndDelete({ slug: req.params.slug });
        if (page) {
            req.session.heading = 'Page Deleted';
            req.session.message = `Successfully deleted the page: "${page.title}"`;
        } else {
            req.session.heading = 'Error';
            req.session.message = 'Page not found.';
        }
        res.redirect('/admin');
    } catch (err) {
        console.log('Error deleting page:', err);
        req.session.heading = 'Error';
        req.session.message = 'Failed to delete the page.';
        res.redirect('/admin');
    }
});

app.get('/page/:slug', async (req, res) => {
    
    try {
        console.log("Requested Slug:", req.params.slug); 
        const page = await Page.findOne({slug: req.params.slug}); // Find the page by ID
        if (page) {
            const pages = await Page.find();
            res.render('page', { pages:pages, page: page, logname: req.session.user }); // Render the page view with content
        } else {
            res.status(404).send('Page not found'); // If page doesn't exist
        }
    } catch (err) {
        console.log('Error fetching page:', err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin', (req, res) => {
    const heading = req.session.heading;
    const message = req.session.message;

    // Clear the session variables after rendering
    req.session.heading = null;
    req.session.message = null;

    res.render('admin', { logname: req.session.user, heading: heading, message: message });
});

// Start server
app.listen(8080, () => {
    console.log('Server started on http://localhost:8080');
});
