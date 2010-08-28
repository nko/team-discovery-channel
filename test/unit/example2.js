module('nko2');

test("test_assert_2", function() {
    equals(1, 1, "Simple assertion test.");
    equals(jQuery('#content').html(), "Not Some Content", "File 2: Assert that we get the content of a div with an ID.");
});

test("test_query_2", function() {
    var element = $('<div></div>');
    element.text('Hello World!');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    equals($('#foobar').text(), "Hello World!", "File 2: Created element with jQuery added it to DOM and pulled it out.");
});

test("Awesome Test", function() {
    var element = $('<div></div>');
    element.text('Goodbye');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    test.click(function() {
        $(this).text('WOOOOOOOOOO!')
    });
    test.trigger('click');
    equals($('#foobar').text(), "Hello World!", "File 2: Created element with jQuery added it to DOM and pulled it out.");
});