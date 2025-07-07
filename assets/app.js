
        $('.menu .item').tab();
        $('.ui.dropdown').dropdown();

      
        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.session.setMode("ace/mode/json");
        editor.setValue(JSON.stringify({
            "mfa_level": 0,
            "emojis": [
                {
                    "require_colons": true,
                    "animated": false,
                    "managed": false,
                    "name": "bloodmoon",
                    "roles": [],
                    "id": "326074073702727682"
                },
                {
                    "require_colons": true,
                    "animated": true,
                    "managed": false,
                    "name": "vampire",
                    "roles": [],
                    "id": "326074073832620033"
                }
            ],
            "name": "Bloodmoon Server",
            "id": "326073960041152512",
            "icon": null
        }, null, 2));
        editor.clearSelection();

      
        const downloadBtn = $(`<button class="ui labeled icon red button" id="download" type="button"><i class="cloud download icon"></i> Download</button>`);
        const Emoji = (emojiID, animated = false) => `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? "gif" : "png"}?v=1`;
        const Sticker = (stickerID) => `https://cdn.discordapp.com/stickers/${stickerID}.png?size=1024`;

        const API = {
            host: "https://discord.com/api/v10",
            emojis: (guild) => `/guilds/${guild}/emojis`,
            guilds: "/users/@me/guilds",
            guild: (id) => `/guilds/${id}`
        }

        const sortAlpha = (a, b) => {
            a = a.name.toLowerCase();
            b = b.name.toLowerCase();
            return a < b ? -1 : a > b ? 1 : 0
        }

        globalThis.guild = [];
        globalThis.emojis = [];
        globalThis.stickers = [];

        // Show/hide UI elements
        function show(id) {
            $("#messages div.message").hide();
            $(id).fadeIn("slow").css("display", "flex");
        }

        function error(message, ...args) {
            console.error(message, ...args);
            $("button").removeClass("loading");
            $("#error-msg").text(message);
            show("#error");
        }

        // Rename emojis to avoid conflicts
        function renameEmoji(emojis) {
            if (!emojis) return [];
            const emojiCountByName = {};
            const disambiguatedEmoji = [];

            const disambiguateEmoji = emoji => {
                const originalName = emoji.name;
                const existingCount = emojiCountByName[originalName] || 0;
                emojiCountByName[originalName] = existingCount + 1;
                if (existingCount > 0) {
                    const name = `${originalName}~${existingCount}`;
                    emoji = {
                        ...emoji,
                        name,
                        originalName
                    };
                }
                disambiguatedEmoji.push(emoji);
            };

            emojis.forEach(disambiguateEmoji);
            return disambiguatedEmoji;
        }

       
        $("#tokenHelp").click(() => {
            $(".ui.basic.modal").modal("show");
        });

        $("#default-1 #continue").click(async (e) => {
            e.preventDefault();
            $("#error").hide();

            let token = $("#token").val();
            if (!token) return error("Invalid token.");

            $("#continue").addClass("loading");
            token = token.replace(/^"(.+)"$/, "$1");

            try {
                let res = await fetch(API.host + API.guilds, {
                    method: "GET",
                    headers: {
                        "Authorization": token
                    }
                });

                if (!res.ok) return error(res.status === 401 ? "Invalid token." : "Could not authenticate with Discord.");

                const guilds = (await res.json()).sort(sortAlpha);
                const guildsDropdown = guilds.map(guild => {
                    return {
                        name: guild.icon
                            ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" style="width: 24px; height: 24px; margin-right: 10px; border-radius: 50%;" />${guild.name}`
                            : `<i class="fas fa-server" style="margin-right: 10px;"></i>${guild.name}`,
                        value: guild.id
                    }
                });

                $("#server-select").dropdown({
                    values: guildsDropdown,
                    placeholder: "Select Server",
                    onChange: async (value, text, $selected) => {
                        $("#default-2").append(`<div class="ui active dimmer"><div class="ui loader"></div></div>`);
                        $("#error").hide();
                        $("#messages div.message").hide();
                        $("#download").remove();

                        try {
                            let res = await fetch(API.host + API.guild(value), {
                                method: "GET",
                                headers: {
                                    "Authorization": token
                                }
                            });

                            if (!res.ok) return error("Could not fetch server emojis.");

                            globalThis.guild = await res.json();
                            globalThis.emojis = renameEmoji(globalThis.guild.emojis).sort(sortAlpha);
                            globalThis.stickers = globalThis.guild.stickers?.sort(sortAlpha) || [];

                            let emojisDropdown = [];
                            for (const emoji of globalThis.emojis) {
                                emojisDropdown.push({
                                    name: `<img src="${Emoji(emoji.id, emoji.animated)}" style="width: 24px; height: 24px; margin-right: 10px;" /> ${emoji.name}`,
                                    value: emoji.id,
                                    selected: true
                                });
                            }

                            $("#emoji-select").dropdown({
                                values: emojisDropdown,
                                placeholder: "Select Emojis",
                                onChange: (value, text, $selected) => {
                                    $("#emojicount").text(`(${$("input[name='emojis']").val().split(",").length}/${globalThis.emojis.length})`);
                                }
                            });

                            let stickersDropdown = [];
                            for (const sticker of globalThis.stickers) {
                                stickersDropdown.push({
                                    name: `<img src="${Sticker(sticker.id)}" style="width: 48px; height: 48px; margin-right: 10px;" /> ${sticker.name}`,
                                    value: sticker.id,
                                    selected: true
                                });
                            }

                            $("#sticker-select").dropdown({
                                values: stickersDropdown,
                                placeholder: "Select Stickers",
                                onChange: (value, text, $selected) => {
                                    $("#stickercount").text(`(${$("input[name='stickers']").val().split(",").length}/${globalThis.stickers.length})`);
                                }
                            });

                            if (emojisDropdown.length > 0) $("#emojis").show();
                            if (stickersDropdown.length > 0) $("#stickers").show();
                        } catch (err) {
                            error("Failed to fetch server data.");
                        } finally {
                            $(".active.dimmer").remove();
                        }
                    }
                });

                $("#default-1").hide();
                $("#default-2").show();
            } catch (err) {
                error("Network error occurred.");
            } finally {
                $("#continue").removeClass("loading");
            }
        });

        $("#default-2 #submit").click(async (e) => {
            e.preventDefault();

            if (!globalThis.emojis.length && !globalThis.stickers.length)
                return error("Please select at least one emoji or sticker.");

            try {
                const cleanGuildName = globalThis.guild.name
                    .replace(/\s/g, "_")
                    .replace(/\W/g, "");

                show("#loading");
                $("#loading-msg").text("Collecting emojis and stickers...");

                const renamedEmoji = renameEmoji(globalThis.emojis);
                const zip = new JSZip();

                const emojiFolder = zip.folder("Emojis");
                const stickerFolder = zip.folder("Stickers");

                let emojiCount = 0;
                for (let i = 0; i < renamedEmoji.length; i++) {
                    const emoji = renamedEmoji[i];
                    try {
                        const res = await fetch(Emoji(emoji.id, emoji.animated));
                        const blob = await res.blob();
                        emojiFolder.file(`${emoji.name}.${emoji.animated ? "gif" : "png"}`, blob);
                        emojiCount++;
                    } catch (err) {
                        console.error(`Failed to fetch emoji: ${emoji.name}`, err);
                    }
                }

                let stickerCount = 0;
                for (let i = 0; i < globalThis.stickers.length; i++) {
                    const sticker = globalThis.stickers[i];
                    try {
                        const res = await fetch(Sticker(sticker.id));
                        const blob = await res.blob();
                        stickerFolder.file(`${sticker.name}.png`, blob);
                        stickerCount++;
                    } catch (err) {
                        console.error(`Failed to fetch sticker: ${sticker.name}`, err);
                    }
                }

                $("#emoji-count").text(emojiCount);
                $("#sticker-count").text(stickerCount);
                zip.file("🌸 info.txt", `
╭── ⋅🌸⋅ ──╮
  Bloodmoon Emoji Tool
╰── ⋅🌸⋅ ──╯

Hi cutie! 💖
Thanks a ton for using this tool to grab your favorite emojis & stickers!

╭── ✨ Created by ✨ ──╮
・ GitHub: github.com/IIHUII
・ Discord Server: https://discord.gg/S3eBmcWFj4
・ Twitter/X: https://x.com/s2r_o42141
╰────────────────────╯

✨ Feel free to share this tool with your friends!
💌 Don't forget to give some love and credit if you use it.

Stay adorable~
– Bloodmoon Team 🌙`);
                show("#success");
                $("#default-2 #submit").after(downloadBtn);

                downloadBtn.click(() => {
                    zip.generateAsync({ type: "blob" }).then(content => {
                        saveAs(content, `Bloodmoon_Emojis_${cleanGuildName}.zip`);
                    });
                });
            } catch (err) {
                error("Failed to create emoji package.");
            }
        });

        $("#submit-manual").click(async (e) => {
            e.preventDefault();

            const code = editor.getSession().getValue();
            if (!code) return error("Please provide the server JSON data.");

            try {
                const guild = JSON.parse(code);
                if (!guild.id) return error("Invalid server data - missing ID.");
                if (!guild.emojis || guild.emojis.length < 1) return error("This server doesn't have any emojis!");

                const cleanGuildName = guild.name.replace(/\s/g, "_").replace(/\W/g, "");
                show("#loading");
                $("#loading-msg").text("Processing server data...");

                const renamedEmoji = renameEmoji(guild.emojis);
                const zip = new JSZip();

                const emojiFolder = zip.folder("Emojis");
                const stickerFolder = zip.folder("Stickers");

                let emojiCount = 0;
                for (let i = 0; i < renamedEmoji.length; i++) {
                    const emoji = renamedEmoji[i];
                    try {
                        const res = await fetch(Emoji(emoji.id, emoji.animated));
                        const blob = await res.blob();
                        emojiFolder.file(`${emoji.name}.${emoji.animated ? "gif" : "png"}`, blob);
                        emojiCount++;
                    } catch (err) {
                        console.error(`Failed to fetch emoji: ${emoji.name}`, err);
                    }
                }

                let stickerCount = 0;
                if (guild.stickers) {
                    for (let i = 0; i < guild.stickers.length; i++) {
                        const sticker = guild.stickers[i];
                        try {
                            const res = await fetch(Sticker(sticker.id));
                            const blob = await res.blob();
                            stickerFolder.file(`${sticker.name}.png`, blob);
                            stickerCount++;
                        } catch (err) {
                            console.error(`Failed to fetch sticker: ${sticker.name}`, err);
                        }
                    }
                }

                $("#emoji-count").text(emojiCount);
                $("#sticker-count").text(stickerCount);
                show("#success");
                $("#submit-manual").after(downloadBtn);

                downloadBtn.click(() => {
                    zip.generateAsync({ type: "blob" }).then(content => {
                        saveAs(content, `Bloodmoon_Emojis_${cleanGuildName}.zip`);
                    });
                });
            } catch (err) {
                error("Invalid JSON data provided.");
            }
        });


        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentNode;
                faqItem.classList.toggle('active');
            });
        });

        function helpModal() {
            $('.ui.basic.modal').modal('show');
        }

        // Initialize modals
        $('.ui.basic.modal').modal();
