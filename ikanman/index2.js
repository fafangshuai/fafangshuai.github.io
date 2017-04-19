var DataService = (function () {
    var IMAGE_HOST = "http://p.yogajx.com";
    var configPath = "config.json";

    function getImagePath(path, file) {
        var pathPrefix = IMAGE_HOST + path;
        return pathPrefix + handleFileName(file);
    }

    function handleFileName(fileName) {
        var idx = fileName.lastIndexOf(".webp");
        if (idx > 0) {
            fileName = fileName.substring(0, fileName.lastIndexOf(".webp"));
        }
        return fileName;
    }

    return {
        getBooks: function () {
            var books = [];
            $.ajax({
                url: configPath,
                type: "get",
                dataType: "json",
                success: function (data) {
                    $.each(data, function () {
                        books.push(new Book(this.id, this.name, this.path));
                    });
                },
                async: false
            });
            return books;
        },
        getChapters: function (path) {
            if (!path) {
                return null;
            }
            var chapters = [];
            $.ajax({
                url: path,
                type: "get",
                dataType: "text",
                success: function (data) {
                    var chapterJsonArr = data.split("\n");
                    $.each(chapterJsonArr, function () {
                        var chapter = JSON.parse(this);
                        var files = [];
                        $.each(chapter.files, function () {
                            files.push(getImagePath(chapter.path, this));
                        });
                        chapters.push(new Chapter(chapter.cid, chapter.bname + " " + chapter.cname, files));
                    });
                },
                async: false
            });
            return chapters;
        }
    }
})();

function Book(id, name, path) {
    var self = this;
    this.id = id;
    this.name = name;
    this.path = path;
    var chapters = null;
    this.getChapters = function () {
        if (chapters == null) {
            chapters = DataService.getChapters(self.path);
        }
        return chapters;
    };
}
function Chapter(id, name, files) {
    this.id = id;
    this.name = name;
    this.files = files;
    this.totalPage = this.files.length;
    this.getPage = function (page) {
        if (page < 0) {
            page = 0;
        }
        if (page > this.totalPage - 1) {
            page = this.totalPage - 1;
        }
        return this.files[page];
    }
}
var ComicReader = (function () {
    var $viewer = $("#viewer");
    var $pageSelect = $("#pageNav").find("select");
    var $catalogSelect = $("#catalogNav").find("select");
    var $bookSelect = $("#bookNav").find("select");

    var model = {
        bookMap: {},
        chapterMap: {},
        chapterIds: []
    };

    var view = {
        generatePageSelect: function (totalPage) {
            var opts = "";
            for (var i = 0; i < totalPage; i++) {
                var text = "第" + (i + 1) + "页";
                var selected = i == 0 ? ' selected="selected"' : '';
                opts += '<option value="' + i + '"' + selected + '>' + text + '</option>';
            }
            $pageSelect.html($(opts));
        },
        generateCatalogSelect: function (chapters) {
            var opts = "";
            for (var i = 0, len = chapters.length; i < len; i++) {
                var chapter = chapters[i];
                var selected = i == 0 ? ' selected="selected"' : '';
                opts += '<option value="' + chapter.id + '"' + selected + '>' + chapter.name + '</option>';
            }
            $catalogSelect.html($(opts));
        },
        generateBookSelect: function (books) {
            var opts = "<option selected='selected'>请选择</option>";
            for (var i = 0, len = books.length; i < len; i++) {
                var book = books[i];
                opts += '<option value="' + book.id + '">' + book.name + '</option>';
            }
            $bookSelect.html($(opts));
        },
        generateViewer: function (src, nextSrc) {
            $viewer.find("#lightImg").attr("src", src);
            $viewer.find("#shadowImg").attr("src", nextSrc);
        }
    };

    var ctrl = {
        page: 0,
        chapter: null,
        book: null,
        usePreLoad: false,
        gotoPage: function (page) {
            this.page = page * 1;

        },
        changeChapter: function (cid) {
            $catalogSelect.val(cid);
            this.chapter = model.chapterMap[cid];
            view.generatePageSelect()
        },
        changeBook: function (bid) {
            $bookSelect.val(bid);
            this.book = model.bookMap[bid];
            view.generateCatalogSelect(this.book.getChapters());
        },
        loadBooks: function () {
            var books = DataService.getBooks();
            $.each(books, function () {
                model.bookMap[this.id] = this;
            });
            view.generateBookSelect(books);
        }
    };
})();

;(function () {

    var Book = {
        chapters: [],
        chapterIds: [],
        chapterMap: {}
    };
    var $viewer = $("#viewer");
    var $pageSelect = $("#pageNav").find("select");
    var $catalogSelect = $("#catalogNav").find("select");
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

    function generateBookSelect() {

    }


    var CookieUtil = {
        options: {expires: 365, path: "/"},
        setCidAndPage: function (cid, page) {
            var bid = this.getBid();
            Cookies.set("ck" + bid, {"cid": cid, "page": page}, this.options);
        },
        getCidAndPage: function () {
            return Cookies.getJSON("ck" + this.getBid());
        },
        setBid: function (bid) {
            Cookies.set("bid", bid, this.options);
        },
        getBid: function () {
            return Cookies.get("bid");
        },
        remove: function (key) {
            Cookies.reomve(key);
        }
    };

    function initCatalog() {
        $catalogSelect.html(generateCatalogSelect());
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