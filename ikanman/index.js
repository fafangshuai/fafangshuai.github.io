var ComicReader = (function () {
    var DataService = (function () {
        var imageHost = "http://p.yogajx.com";
        var inputPath = "input.json";

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
                    imageHost = opts[imageHost] || imageHost;
                    inputPath = opts[inputPath] || inputPath;
                }
            },
            getChapters: function () {
                var chapters = [];
                $.ajax({
                    url: inputPath,
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

    var Cache = {
        chapterMap: {},
        chapters: {}
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
        }
    };

    var Current = {
        page: 0,
        chapter: null,
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
            CookieUtil.setPage(this.page);
            View.triggerPageChange();
        },
        setChapter: function (chapter) {
            this.chapter = chapter;
            CookieUtil.setCid(this.chapter.id);
            View.triggerChapterChange();
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
            var chapterArr = Cache.chapters;
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
        loadChapters: function () {
            Cache.chapters = DataService.getChapters();
            View.generateCatalogSelect(Cache.chapters);
            $.each(Cache.chapters, function () {
                Cache.chapterMap[this.id] = this;
            });
            var cid = CookieUtil.getCid();
            if (cid) {
                Current.setChapter(Cache.chapterMap[cid]);
            } else {
                Current.setChapter(chapters[0]);
            }
            var page = CookieUtil.getPage();
            if (page) {
                Current.setPage(page);
            } else {
                Current.setPage(0);
            }
        },
        bindEvent: function () {
            var self = this;
            $catalogSelect.on("change", function () {
                Current.setChapter(Cache.chapterMap[$(this).val()]);
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

    function ComicReader() {
        this.init = function (opts) {
            DataService.config(opts);
            Ctrl.loadChapters();
            Ctrl.bindEvent();
        };
        this.printChapters = function () {
            console.log(Cache.chapters);
        };
        this.init();
    }

    return new ComicReader();
})();