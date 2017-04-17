(function () {
    var IMAGE_HOST = "http://p.yogajx.com";
    var Book = {
        chapters: [],
        chapterIds: [],
        chapterMap: {}
    };
    var $viewer = $("#viewer");
    var $pageSelect = $("#pageSelect").find("select");
    var $catalogSelect = $("#catalog").find("select");
    var usePreLoad = false;

    function loadData() {
        $.ajax({
            url: "input.json",
            type: "get",
            dataType: "text",
            success: function (data) {
                Book.chapters = getChapters(data);
                for (var i = 0, len = Book.chapters.length; i < len; i++) {
                    var chapter = Book.chapters[i];
                    Book.chapterMap[chapter.cid] = chapter;
                    Book.chapterIds.push(chapter.cid);
                }
            },
            async: false
        });
    }

    function getChapters(data) {
        var chapters = [];
        var chapterJsonArr = data.split("\n");
        for (var i = 0, len = chapterJsonArr.length; i < len; i++) {
            var chapter = JSON.parse(chapterJsonArr[i]);
            chapters.push(chapter);
        }
        return chapters;
    }

    function generateViewer(cid, page) {
        var src;
        if (usePreLoad) {
            var preLoadSrc = $viewer.find("#shadowImg").attr("src");
            src = preLoadSrc ? preLoadSrc : getImagePath(cid, page);
        } else {
            src = getImagePath(cid, page);
        }
        $viewer.find("#lightImg").attr("src", src);
        $viewer.find("#shadowImg").attr("src", getImagePath(cid, page + 1));
        usePreLoad = false;
    }

    function getImagePath(cid, page) {
        var chapter = Book.chapterMap[cid];
        var pathPrefix = IMAGE_HOST + chapter.path;
        var files = chapter["files"];
        if (page < 0) {
            page = 0;
        } else if (page > files.length - 1) {
            page = files.length - 1;
        }
        return pathPrefix + handleFileName(files[page]);
    }

    function handleFileName(fileName) {
        var idx = fileName.lastIndexOf(".webp");
        if (idx > 0) {
            fileName = fileName.substring(0, fileName.lastIndexOf(".webp"));
        }
        return fileName;
    }

    function generateCatalog() {
        var select = $('<select class="form-control"></select>');
        var opts = "";
        for (var i = 0, len = Book.chapters.length; i < len; i++) {
            var chapter = Book.chapters[i];
            var chapterName = chapter.bname + "" + chapter.cname;
            var selected = i == 0 ? ' selected="selected"' : '';
            opts += '<option value="' + chapter.cid + '"' + selected + '>' + chapterName + '</option>';
        }
        return $(opts);
    }

    function generatePageSelect(totalPage) {
        var opts = "";
        for (var i = 0; i < totalPage; i++) {
            var text = "第" + (i + 1) + "页";
            var selected = i == 0 ? ' selected="selected"' : '';
            opts += '<option value="' + i + '"' + selected + '>' + text + '</option>';
        }
        return $(opts);
    }

    var CookieUtil = {
        options: {expires: 365, path: "/"},
        setCid: function (cid) {
            Cookies.set("cid", cid, this.options);
        },
        setPage: function (page) {
            Cookies.set("page", page, this.options);
        },
        getCid: function () {
            return Cookies.get("cid");
        },
        getPage: function () {
            return Cookies.get("page");
        },
        remove: function (key) {
            Cookies.reomve(key);
        }
    };

    function initCatalog() {
        $catalogSelect.html(generateCatalog());
    }

    function bindEvent() {
        var self = this;
        $catalogSelect.on("change", function () {
            self.changeChapter($(this).val());
            self.gotoPage(0);
        });
        $pageSelect.on("change", function () {
            self.gotoPage($(this).val());
        });
        $("li.previous").on("click", function () {
            self.pageByBtn("prev");
        });
        $("li.next, #lightImg").on("click", function () {
            self.pageByBtn("next");
        });
    }

    window.IKanman = {
        page: 0,
        cid: 0,
        totalPage: 0,
        init: function () {
            loadData();
            bindEvent.bind(this)();
            initCatalog();
            var targetCid;
            if (CookieUtil.getCid()) {
                targetCid = CookieUtil.getCid();
                $catalogSelect.val(targetCid);
            } else {
                targetCid = $catalogSelect.val();
            }
            this.changeChapter(targetCid);
            var lastPage;
            if (CookieUtil.getPage()) {
                lastPage = CookieUtil.getPage();
            } else {
                lastPage = 0;
            }
            $pageSelect.val(lastPage);
            this.gotoPage(lastPage);
        },

        changeChapter: function (cid) {
            this.cid = cid * 1;
            var files = Book.chapterMap[this.cid]["files"];
            this.totalPage = files.length;
            $pageSelect.html(generatePageSelect(this.totalPage));
            CookieUtil.setCid(this.cid);
        },
        pageByBtn: function (direction) {
            var isChangeChapter = false;
            var page = this.page;
            if (direction == "next") {
                if (page >= this.totalPage - 1) {
                    usePreLoad = false;
                    isChangeChapter = this.autoChangeChapter(direction);
                } else {
                    page = page + 1;
                    usePreLoad = true;
                }
            } else if (direction == "prev") {
                if (page <= 0) {
                    isChangeChapter = this.autoChangeChapter(direction);
                } else {
                    page = page - 1;
                }
            }
            if (!isChangeChapter) {
                $pageSelect.val(page);
                this.gotoPage(page);
            }
        },
        autoChangeChapter: function (direction) {
            if (!direction) {
                return false;
            }
            var cidArr = Book.chapterIds;
            var idx = cidArr.indexOf(this.cid);
            if (direction == "next") {
                if (idx == cidArr.length - 1) {
                    alert("已经看到最后一章");
                    return false;
                }
                $catalogSelect.val(cidArr[idx + 1]);
            } else if (direction == "prev") {
                if (idx == 0) {
                    alert("已经看到第一章");
                    return false;
                }
                $catalogSelect.val(cidArr[idx - 1]);
            }
            $catalogSelect.trigger("change");
            return true;
        },
        gotoPage: function (page) {
            this.page = page * 1;
            generateViewer(this.cid, this.page);
            CookieUtil.setPage(this.page);
        },
        printCatalog: function () {
            console.log(Book.chapters);
        }
    };
})();
$(function () {
    window.IKanman.init();
});