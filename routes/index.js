var express = require('express');
var router = express.Router();
const path = require('path')



//測試伺服器是否成功
router.get('/', function(req, res, next) {    
    res.render('index', { title: 'Success Open Server' }); 
});

module.exports = router;
