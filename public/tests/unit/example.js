var data = "";

module('test');
test("test_assertions", function() {
    equals(document.jQuery('.your-face').html(), "A banana", "This test should fail.");
    equals(1, 1, "This test shouldn't fail fail.");
});