var ComicReader = (function () {
    var DataService = (function () {
        var imageHost = "http://p.yogajx.com";
        var configPath = "config.json";

        function getImagePath(path, file) {
            var pathPrefix = imageHost + path;
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
            config: function (opts) {
                if (opts) {
                    imageHost = opts["imageHost"] || imageHost;
                }
            },
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
                            chapters.sort(function (left, right) {
                                return left.id - right.id;
                            });
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
        var chapterMap = {};

        function loadChapters() {
            chapters = DataService.getChapters(self.path);
            for (var i = 0, len = chapters.length; i < len; i++) {
                var chapter = chapters[i];
                chapterMap[chapter.id] = chapter;
            }
        }

        this.getChapters = function () {
            if (chapters == null || chapterMap == null) {
                loadChapters();
            }
            return chapters;
        };
        this.getChapter = function (cid) {
            if (chapters == null || chapterMap == null) {
                loadChapters();
            }
            return chapterMap[cid];
        }
    }

    function Chapter(id, name, files) {
        this.id = id;
        this.name = name;
        this.files = files;
        this.totalPage = this.files.length;
        this.getPageUrl = function (page) {
            if (page < 0) {
                page = 0;
            }
            if (page > this.totalPage - 1) {
                page = this.totalPage - 1;
            }
            return this.files[page];
        }
    }

    var $viewer = $("#viewer");
    var $pageSelect = $("#pageNav").find("select");
    var $catalogSelect = $("#catalogNav").find("select");
    var $bookSelect = $("#bookNav").find("select");

    var Cache = {
        bookMap: {}
    };

    var View = {
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
            var opts = "";
            for (var i = 0, len = books.length; i < len; i++) {
                var book = books[i];
                var selected = i == 0 ? ' selected="selected"' : '';
                opts += '<option value="' + book.id + '"' + selected + '>' + book.name + '</option>';
            }
            $bookSelect.html($(opts));
        },
        generateViewer: function (src, nextSrc, usePreLoad) {
            if (usePreLoad) {
                var visible = $viewer.find("img:visible").attr("src", nextSrc);
                $viewer.find("img:hidden").show();
                visible.hide();
            } else {
                $viewer.find("img:visible").attr("src", src);
                $viewer.find("img:hidden").attr("src", nextSrc);
            }
        },
        triggerPageChange: function () {
            $pageSelect.val(Current.page);
            var src = Current.chapter.getPageUrl(Current.page);
            var nextSrc = Current.chapter.getPageUrl(Current.page + 1);
            this.generateViewer(src, nextSrc, Current.usePreLoad);
        },
        triggerChapterChange: function () {
            $catalogSelect.val(Current.chapter.id);
            this.generatePageSelect(Current.chapter.totalPage);
        },
        triggerBookChange: function () {
            $bookSelect.val(Current.book.id);
            this.generateCatalogSelect(Current.book.getChapters());
            var cidAndPage = CookieUtil.getCidAndPage();
            var chapter;
            var page;
            if (cidAndPage) {
                chapter = Current.book.getChapter(cidAndPage["cid"]);
                page = cidAndPage["page"];
            } else {
                chapter = Current.book.getChapters()[0];
                page = 0;
            }
            Current.setChapter(chapter);
            Current.setPage(page);
        }
    };

    var Current = {
        page: 0,
        chapter: null,
        book: null,
        usePreLoad: true,
        setPage: function (page) {
            page = page * 1;
            if (page < 0) {
                page = 0;
            }
            if (page >= this.chapter.totalPage) {
                page = this.chapter.totalPage - 1;
            }
            if (this.page == 0) {
                this.usePreLoad = false;
            } else {
                this.usePreLoad = this.page + 1 == page;
            }
            this.page = page;
            CookieUtil.setCidAndPage(this.chapter.id, this.page);
            View.triggerPageChange();
        },
        setChapter: function (chapter) {
            this.chapter = chapter;
            CookieUtil.setCidAndPage(this.chapter.id, this.page);
            View.triggerChapterChange();
        },
        setBook: function (book) {
            this.book = book;
            CookieUtil.setBid(this.book.id);
            View.triggerBookChange();
        }
    };

    var Ctrl = {
        nextPage: function () {
            if (Current.page >= Current.chapter.totalPage - 1) {
                this.autoChangeChapter("next");
            } else {
                Current.setPage(Current.page + 1);
            }
        },
        prevPage: function () {
            if (Current.page <= 0) {
                this.autoChangeChapter("prev");
            } else {
                Current.setPage(Current.page - 1);
            }
        },
        autoChangeChapter: function (direction) {
            if (!direction) {
                return;
            }
            var chapterArr = Current.book.getChapters();
            var idx = chapterArr.indexOf(Current.chapter);
            if (direction == "next") {
                if (idx == chapterArr.length - 1) {
                    alert("已经看到最后一章");
                    return;
                }
                Current.setChapter(chapterArr[idx + 1]);
                Current.setPage(0);
            } else if (direction == "prev") {
                if (idx == 0) {
                    alert("已经看到第一章");
                    return;
                }
                Current.setChapter(chapterArr[idx - 1]);
                Current.setPage(0);
            }
        },
        loadBooks: function () {
            var books = DataService.getBooks();
            View.generateBookSelect(books);
            $.each(books, function () {
                Cache.bookMap[this.id] = this;
            });
            if (CookieUtil.getBid()) {
                Current.setBook(Cache.bookMap[CookieUtil.getBid()]);
            } else {
                Current.setBook(books[0]);
            }
        },
        bindEvent: function () {
            var self = this;
            $bookSelect.on("change", function () {
                Current.setBook(Cache.bookMap[$(this).val()]);
            });
            $catalogSelect.on("change", function () {
                Current.setChapter(Current.book.getChapter($(this).val()));
                Current.setPage(0);
            });
            $pageSelect.on("change", function () {
                Current.setPage($(this).val());
            });
            $("li.previous").on("click", function () {
                self.prevPage();
            });
            $("li.next, #viewer>img").on("click", function () {
                self.nextPage();
            });
        }
    };

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

    function ComicReader() {
        this.init = function (opts) {
            DataService.config(opts);
            Ctrl.loadBooks();
            Ctrl.bindEvent();
        };
        this.printBooks = function () {
            console.log(Object.values(Cache.bookMap));
        };
        this.printChapters = function () {
            console.log(Current.book.getChapters());
        };
        this.init();
    }

    return new ComicReader();
})();