module('nko2');

test("test_assert_2", function() {
    equals(1, 2, "Simple assertion test.");
    //equals(jQuery('#content').html(), "Some Content", "File 2: Assert that we get the content of a div with an ID.");
});

test("test_query_2", function() {
    var element = $('<div></div>');
    element.text('Hello World!');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    equals($('#foobar').text(), "Hello World!", "File 2: Created element with jQuery added it to DOM and pulled it out.");
});

// Testing whether click events are working
// proplerly in Who Unit?
test("Click Event Test", function() {
    var element = $('<div></div>');
    element.text('Original Value');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    test.click(function() {
        $(this).text('Onclick Value')
    });
    test.trigger('click');
    equals($('#foobar').text(), "Onclick Value", "Had onclick event change the value of an element.");
});