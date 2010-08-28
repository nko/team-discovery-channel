var data = "";

QUnit.testDone = function(name, failures, total) {    
    data += "<b>Failures:</b>" + failures + "<br />";
    data += "<b>Total:</b>" + total + "<br />";
    data += "foo";
}

QUnit.log = function(result, message) {
    if (result) {
        data += "<div style='color: green'>" +message + "</div>";
    } else {
        data += "<div style='color: red'>" +message + "</div>";
    }
}

module('test');
test("test_assertions", function() {
    equals(document.jQuery('.your-face').html(), "A banana", "This test should fail.");
    equals(1, 1, "This test shouldn't fail fail.");
}); 
start();


element = $('<b></b>');
element.html('HELLO WORLD');
snuh = element.text();

setTimeout(function() {
  //  foobar = 'asdfasdfasdfasd,,dkdkdkd,dkdkdklsss.s.s...';
}, 0);