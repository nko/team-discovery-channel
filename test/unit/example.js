module('nko');

test("test_assertions", function() {
    equals(1, 1, "Simple assertion test.");
    equals(jQuery('#content').html(), "Not Some Content", "Assert that we get the content of a div with an ID.");
});