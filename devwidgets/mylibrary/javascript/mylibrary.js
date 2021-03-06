/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

// load the master sakai object to access all Sakai OAE API methods
require(["jquery", "sakai/sakai.api.core"], function($, sakai) {

    /**
     * @name sakai_global.mylibrary
     *
     * @class mylibrary
     *
     * @description
     * My Hello World is a dashboard widget that says hello to the current user
     * with text in the color of their choosing
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.mylibrary = function (tuid, showSettings) {

        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        var mylibrary = {  // global data for mylibrary widget
            totalItems: 0,
            itemsPerPage: 8,
            currentPagenum: 1,
            sortBy: "_lastModified",
            sortOrder: "desc",
            isOwnerViewing: false,
            default_search_text: ""
        };

        // DOM jQuery Objects
        var $rootel = $("#" + tuid);  // unique container for each widget instance
        var $mylibrary_items = $("#mylibrary_items", $rootel);
        var $mylibrary_check = $(".mylibrary_check", $rootel);
        var $mylibrary_check_all = $("#mylibrary_check_all", $rootel);
        var $mylibrary_remove = $("#mylibrary_remove", $rootel);
        var $mylibrary_sortby = $("#mylibrary_sortby", $rootel);
        var $mylibrary_livefilter = $("#mylibrary_livefilter", $rootel);
        var $mylibrary_sortarea = $("#mylibrary_sortarea", $rootel);
        var $mylibrary_empty = $("#mylibrary_empty", $rootel);
        var $mylibrary_empty_note = $("#mylibrary_empty_note", $rootel);
        var $mylibrary_admin_actions = $("#mylibrary_admin_actions", $rootel);
        var $mylibrary_addcontent = $("#mylibrary_addcontent", $rootel);


        ///////////////////////
        // Utility Functions //
        ///////////////////////

        /**
         * Reset the current my library view
         *
         * @param {String} query  optional query string to limit search results
         */
        var reset = function (query) {
            $mylibrary_items.html("");
            $mylibrary_check_all.removeAttr("checked");
            $mylibrary_remove.attr("disabled", "disabled");
            getLibraryItems(sakai_global.profile.main.data.homePath.split("~")[1],
                renderLibraryItems, query || false);
        };

        /**
         * Show the given page of library items.
         *
         * @param {int} pagenum The page number you want to display (not 0-indexed)
         */
        var showPage = function (pagenum) {
            showPager(pagenum);
            mylibrary.currentPagenum = pagenum;
            reset();
        };

        /**
         * Show the pager at the bottom of the page.
         *
         * @param {int} pagenum The number of the current page (not 0-indexed)
         */
        var showPager = function (pagenum) {
            mylibrary.currentPagenum = pagenum;
            if (Math.ceil(mylibrary.totalItems / mylibrary.itemsPerPage) > 1) {
                $("#mylibrary_pager", $rootel).pager({
                    pagenumber: pagenum,
                    pagecount: Math.ceil(mylibrary.totalItems / mylibrary.itemsPerPage),
                    buttonClickCallback: showPage
                });
            }
        };

        /**
         * Get personalized text for the given message bundle key based on
         * whether this library is owned by the viewer, or belongs to someone else.
         * The message should contain a '${firstname}' variable to replace with
         * and be located in this widget's properties files.
         *
         * @param {String} bundleKey The message bundle key
         */
        var getPersonalizedText = function (bundleKey) {
            if (mylibrary.isOwnerViewing) {
                return sakai.api.i18n.Widgets.getValueForKey(
                    "mylibrary","",bundleKey).replace(/\$\{firstname\}/gi,
                        sakai.api.i18n.General.getValueForKey("YOUR").toLowerCase());
            } else {
                return sakai.api.i18n.Widgets.getValueForKey(
                    "mylibrary","",bundleKey).replace(/\$\{firstname\}/gi,
                        sakai_global.profile.main.data.basic.elements.firstName.value + "'s");
            }
        };

        ////////////////////
        // Event Handlers //
        ////////////////////

        $mylibrary_check.live("change", function (ev) {
            if ($(this).is(":checked")) {
                $mylibrary_remove.removeAttr("disabled");
            } else if (!$(".mylibrary_check:checked", $rootel).length) {
                $mylibrary_remove.attr("disabled", "disabled");
            }
        });

        $mylibrary_check_all.change(function (ev) {
            if ($(this).is(":checked")) {
                $(".mylibrary_check").attr("checked", "checked");
                $mylibrary_remove.removeAttr("disabled");
            } else {
                $(".mylibrary_check").removeAttr("checked");
                $mylibrary_remove.attr("disabled", "disabled");
            }
        });

        $mylibrary_remove.click(function (ev) {
            var $checked = $(".mylibrary_check:checked", $rootel);
            if ($checked.length) {
                var paths = [];
                $checked.each(function () {
                    paths.push("/p/" + this.id.split("mylibrary_check_")[1]);
                });
                $(window).trigger('init.deletecontent.sakai', [{
                    path: paths
                }, function (success) {
                    if (success) {
                        mylibrary.currentPagenum = 1;
                        reset();
                    }
                }]);
            }
        });

        $mylibrary_sortby.change(function (ev) {
            var sortSelection = this.options[this.selectedIndex].value;
            switch (sortSelection) {
                case "lastModified_asc":
                    mylibrary.sortBy = "_lastModified";
                    mylibrary.sortOrder = "asc";
                    break;
                default:
                    mylibrary.sortBy = "_lastModified";
                    mylibrary.sortOrder = "desc";
                    break;
            }
            reset();
        });

        $mylibrary_livefilter.keyup(function (ev) {
            var q = $.trim(this.value);
            if (q && ev.keyCode != 16) {
                $mylibrary_livefilter.addClass("mylibrary_livefilter_working");
                reset(q);
            }
            return false;
        });

        $mylibrary_livefilter.focus(function (ev) {
            $input = $(this);
            $input.removeClass("mylibrary_meta");
            if ($.trim($input.val()) === mylibrary.default_search_text) {
                $input.val("");
            }
        });

        $mylibrary_livefilter.blur(function (ev) {
            $input = $(this);
            if ($.trim($input.val()) === "") {
                $input.addClass("mylibrary_meta");
                $input.val(mylibrary.default_search_text);
            }
        });

        $mylibrary_addcontent.click(function (ev) {
            $(window).trigger("init.newaddcontent.sakai");
            return false;
        });

        ////////////////////////////////////////////
        // Data retrieval and rendering functions //
        ////////////////////////////////////////////

        /**
         * Gets the given user's library items and passes them to the callback
         * function
         *
         * @param {String} userid      the user id for the user whose library items we want
         * @param {Function} callback  function called with the following args:
         *     {Boolean} success - whether or not the fetch succeeded
         *     {Object} items - an array of library items or null if no success
         * @param {String} query       optional query string to limit search results
         */
        var getLibraryItems = function (userid, callback, query) {

            /**
             * Formats a tag list from the server for display in the UI
             *
             * @param {Array} tags  an array of tags from the server
             * @return {Array} an array of tags formatted for the UI
             */
            var formatTags = function (tags) {
                if (!tags) {
                    return null;
                }
                var formatted_tags = [];
                $.each(tags, function (i, name) {
                    formatted_tags.push({
                        name: name,
                        link: "/search#tag=/tags/" + name
                    });
                });
                return formatted_tags;
            };

            /**
             * Returns the number of people using the given item
             *
             * @param {Object} item  the item object returned from the server
             * @return {Number} the number of users using this item
             */
            var getNumPeopleUsing = function (item) {
                // Need KERN feed changes
                return 0;
            };

            /**
             * Returns the number of groups using the given item
             *
             * @param {Object} item  the item object returned from the server
             * @return {Number} the number of groups using this item
             */
            var getNumGroupsUsing = function (item) {
                // Need KERN feed changes
                return 0;
            };

            /**
             * Returns the number of comments for the given item
             *
             * @param {Object} item  the item object returned from the server
             * @return {Number} the number of comments for this item
             */
            var getNumComments = function (item) {
                if (!item) {
                    return 0;
                }
                var id = item["jcr:path"];
                var count = 0;
                if (item[id + "/comments"]) {
                    $.each(item[id + "/comments"], function (param, value) {
                        if (param.indexOf("/comments/") != -1) {
                            count++;
                        }
                    });
                }
                return count;
            };

            /**
             * Process library item results from the server
             */
            var handleLibraryItems = function (success, data) {
                if (success && data && data.results) {
                    mylibrary.totalItems = data.total;
                    var items = [];
                    if (mylibrary.totalItems === 0) {
                        callback(true, items);
                        return;
                    }
                    $.each(data.results, function (i, result) {
                        var mimetypeObj = sakai.api.Content.getMimeTypeData(result["_mimeType"] || result["sakai:custom-mimetype"]);
                        items.push({
                            id: result["jcr:path"],
                            filename: result["sakai:pooled-content-file-name"],
                            link: "/content#content_path=/p/" + result["jcr:path"],
                            last_updated: $.timeago(new Date(result["_lastModified"])),
                            type: sakai.api.i18n.General.getValueForKey(mimetypeObj.description),
                            type_src: mimetypeObj.URL,
                            ownerid: result["sakai:pool-content-created-for"],
                            ownername: sakai.data.me.user.userid === result["sakai:pool-content-created-for"] ?
                                sakai.api.i18n.General.getValueForKey("YOU") :
                                result["sakai:pool-content-created-for"],  // using id for now - need to get firstName lastName
                            tags: formatTags(result["sakai:tags"]),
                            numPeopleUsing: getNumPeopleUsing(),
                            numGroupsUsing: getNumGroupsUsing(),
                            numComments: getNumComments(result),
                            mimeType: result["_mimeType"] || result["sakai:custom-mimetype"],
                            fullResult: result
                        });
                    });
                    if (callback && typeof(callback) === "function") {
                        callback(true, items);
                    }
                } else {
                    debug.error("Fetching library items for userid: " + userid + " failed");
                    if (callback && typeof(callback) === "function") {
                        callback(false, null);
                    }
                }
            };

            // fetch the data
            sakai.api.Server.loadJSON("/var/search/pool/manager-viewer.json",
                handleLibraryItems, {
                    userid: userid,
                    page: mylibrary.currentPagenum - 1,
                    items: mylibrary.itemsPerPage,
                    sortOn: mylibrary.sortBy,
                    sortOrder: mylibrary.sortOrder,
                    q: query || "*"
                }
            );
        };

        /**
         * Renders the given library items
         *
         * @param {Boolean} success - whether or not we have library items
         * @param {Array} items - an array of library items or null if no success
         */
        var renderLibraryItems = function (success, items) {
            if (success && items.length) {
                var json = {
                    items: items,
                    user_is_owner: function (item) {
                        if (!item) return false;
                        return sakai.data.me.user.userid === item.ownerid && mylibrary.isOwnerViewing;
                    },
                    user_is_manager: function (item) {
                        if (!item) return false;
                        return sakai.data.me.user.userid === item.ownerid;
                    }
                };
                json.sakai = sakai;
                if (mylibrary.isOwnerViewing) {
                    $mylibrary_admin_actions.show();
                }
                $mylibrary_livefilter.show();
                $mylibrary_sortarea.show();
                $mylibrary_empty.hide();
                $("#mylibrary_title_bar").show();
                $("#mylibrary_items", $rootel).html(sakai.api.Util.TemplateRenderer($("#mylibrary_items_template", $rootel), json));
                showPager(mylibrary.currentPagenum);
                $mylibrary_livefilter.removeClass("mylibrary_livefilter_working");
            } else {
                $mylibrary_admin_actions.hide();
                $mylibrary_livefilter.hide();
                $mylibrary_sortarea.hide();
                $("#mylibrary_title_bar").hide();
                $mylibrary_empty_note.html(getPersonalizedText("NO_ITEMS_IN_YOUR_LIBRARY"));
                $mylibrary_empty.show();
                if (mylibrary.isOwnerViewing) {
                    $mylibrary_addcontent.show();
                }
            }
        };

        /////////////////////////////
        // Initialization function //
        /////////////////////////////

        /**
         * Initialization function that is run when the widget is loaded. Determines
         * which mode the widget is in (settings or main), loads the necessary data
         * and shows the correct view.
         */
        var doInit = function () {
            var userid = sakai_global.profile.main.data.homePath.split("~")[1];
            if (userid) {
                if (userid === sakai.data.me.user.userid) {
                    mylibrary.isOwnerViewing = true;
                }
                mylibrary.default_search_text = getPersonalizedText("SEARCH_YOUR_LIBRARY");
                $mylibrary_livefilter.val(mylibrary.default_search_text);
                mylibrary.currentPagenum = 1;
                getLibraryItems(userid, renderLibraryItems);
                sakai.api.Util.TemplateRenderer("mylibrary_title_template", {
                    isMe: mylibrary.isOwnerViewing, 
                    firstName: sakai_global.profile.main.data.basic.elements.firstName.value
                }, $("#mylibrary_title_container", $rootel));
            } else {
                debug.warn("No user found for My Library");
            }
        };

        // run the initialization function when the widget object loads
        doInit();

        // Listen for complete.fileupload.sakai event (from the fileupload widget)
        // to refresh this widget's file listing
        $(window).bind("complete.fileupload.sakai", function() {
            mylibrary.currentPagenum = 1;
            reset();
        });

    };

    // inform Sakai OAE that this widget has loaded and is ready to run
    sakai.api.Widgets.widgetLoader.informOnLoad("mylibrary");
});
