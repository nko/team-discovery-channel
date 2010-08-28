module('nko');

test("test_assertions", function() {
    equals(1, 1, "Simple assertion test.");
    equals(jQuery('#content').html(), "Not Some Content", "Assert that we get the content of a div with an ID.");
});

test("test_jquery", function() {
    var element = $('<div></div>');
    element.text('Hello World!');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    equals($('#foobar').text(), "Hello World!", "Created element with jQuery added it to DOM and pulled it out.");
});