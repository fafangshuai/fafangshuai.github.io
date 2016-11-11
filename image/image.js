$(function () {
    init();
});

function init() {
    $.getJSON('manifest.json', function(data) {
        generateList(data);
    });
}

function generateList(data) {
    if (data && data.length > 0) {
        var $imgList = $("#imgList");
        for (var i in data) {
            var group = data[i];
            var prefix = group['dir'] + '/';
            var span = document.createElement('span');
            $(span).html(group['dir']);
            var ul = document.createElement('ul');
            for (var j in group['list']) {
                var imgName = group['list'][j];
                var li = document.createElement('li');
                var a = document.createElement('a');
                $(a).attr('href', prefix + imgName).attr('target', '_blank').html(imgName);
                $(li).append(a).appendTo(ul);
            }
            $imgList.append(span).append(ul).append('<br/>');
        }
    }
}