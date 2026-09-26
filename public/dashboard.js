const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));


// =====================================================
// Pony API
// =====================================================

const CHARACTER_API =
    "https://ponyapi.net/v1/character/all?limit=500";

const EPISODE_API =
    "https://ponyapi.net/v1/episode/all?limit=500";


let characters = [];
let episodes = [];


// =====================================================
// โหลด Character
// =====================================================

async function loadCharacters() {

    try {

        const response =
            await fetch(CHARACTER_API);

        if (!response.ok) {

            throw new Error(
                `Character API Error: ${response.status}`
            );

        }

        const result =
            await response.json();

        characters =
            result.data || [];

        console.log(
            `โหลดตัวละครสำเร็จ ${characters.length} ตัว`
        );

    } catch (error) {

        console.error(
            "โหลด Character ไม่สำเร็จ:",
            error.message
        );

    }

}


// =====================================================
// โหลด Episode
// =====================================================

async function loadEpisodes() {

    try {

        const response =
            await fetch(EPISODE_API);

        if (!response.ok) {

            throw new Error(
                `Episode API Error: ${response.status}`
            );

        }

        const result =
            await response.json();

        episodes =
            result.data || [];

        console.log(
            `โหลด Episode สำเร็จ ${episodes.length} ตอน`
        );

    } catch (error) {

        console.error(
            "โหลด Episode ไม่สำเร็จ:",
            error.message
        );

    }

}


// =====================================================
// หา Season จากข้อมูล Character
// =====================================================

function getCharacterSeasons(character) {

    const text = [

        character.residence || "",

        character.occupation || "",

        ...(character.image || [])

    ].join(" ");


    const seasons = new Set();


    // -------------------------------------------------
    // หา S1E1, S4E26, S9E26
    // -------------------------------------------------

    const episodeCodes =
        text.match(
            /S(\d{1,2})E\d{1,2}/gi
        ) || [];


    episodeCodes.forEach(code => {

        const match =
            code.match(
                /S(\d{1,2})E\d{1,2}/i
            );

        if (match) {

            seasons.add(
                Number(match[1])
            );

        }

    });


    // -------------------------------------------------
    // หา "season 1 to 4"
    // -------------------------------------------------

    const seasonRanges =
        text.match(
            /seasons?\s*(\d+)\s*(?:to|-)\s*(\d+)/gi
        ) || [];


    seasonRanges.forEach(range => {

        const match =
            range.match(
                /seasons?\s*(\d+)\s*(?:to|-)\s*(\d+)/i
            );


        if (!match) {
            return;
        }


        const start =
            Number(match[1]);

        const end =
            Number(match[2]);


        for (
            let i = start;
            i <= end;
            i++
        ) {

            seasons.add(i);

        }

    });


    // -------------------------------------------------
    // หา "season 8"
    // -------------------------------------------------

    const singleSeasons =
        text.match(
            /season\s*(\d+)/gi
        ) || [];


    singleSeasons.forEach(seasonText => {

        const match =
            seasonText.match(
                /season\s*(\d+)/i
            );


        if (match) {

            seasons.add(
                Number(match[1])
            );

        }

    });


    return [
        ...seasons
    ].sort(
        (a, b) => a - b
    );

}


// =====================================================
// หา Episode Code จากข้อมูล Character
// =====================================================

function getCharacterEpisodes(character) {

    const text = [

        character.residence || "",

        character.occupation || "",

        ...(character.image || [])

    ].join(" ");


    const matches =
        text.match(
            /S\d{1,2}E\d{1,2}/gi
        ) || [];


    return [
        ...new Set(
            matches.map(
                code =>
                    code.toUpperCase()
            )
        )
    ];

}


// =====================================================
// เพิ่มข้อมูล Season / Episode ให้ Character
// =====================================================

function addAppearanceData(character) {

    const seasons =
        getCharacterSeasons(
            character
        );


    const episodeCodes =
        getCharacterEpisodes(
            character
        );


    const appearanceEpisodes =
        episodeCodes.map(code => {

            const match =
                code.match(
                    /S(\d+)E(\d+)/i
                );


            if (!match) {
                return null;
            }


            const season =
                Number(match[1]);

            const episodeNumber =
                Number(match[2]);


            const episodeData =
                episodes.find(ep =>

                    Number(ep.season) ===
                        season &&

                    Number(ep.episode) ===
                        episodeNumber

                );


            return {

                code,

                season,

                episode:
                    episodeNumber,

                name:
                    episodeData
                        ? episodeData.name
                        : "ไม่พบชื่อ Episode"

            };

        })
        .filter(Boolean);


    return {

        ...character,

        seasons,

        appearanceEpisodes,

        episodeCount:
            appearanceEpisodes.length

    };

}


// =====================================================
// GET Characters
// =====================================================

app.get(
    "/characters",
    (req, res) => {

        const data =
            characters.map(
                character =>
                    addAppearanceData(
                        character
                    )
            );


        res.json({

            count:
                data.length,

            data

        });

    }
);


// =====================================================
// GET Character รายตัว
// =====================================================

app.get(
    "/characters/:id",
    (req, res) => {

        const id =
            Number(req.params.id);


        const character =
            characters.find(
                character =>
                    character.id === id
            );


        if (!character) {

            return res.status(404).json({

                error:
                    "ไม่พบตัวละคร"

            });

        }


        const data =
            addAppearanceData(
                character
            );


        res.json(data);

    }
);


// =====================================================
// Start Server
// =====================================================

async function startServer() {

    console.log(
        "กำลังโหลดข้อมูลจาก Pony API..."
    );


    await Promise.all([

        loadCharacters(),

        loadEpisodes()

    ]);


    app.listen(
        PORT,
        () => {

            console.log("");
            console.log(
                "================================"
            );

            console.log(
                `Server running at http://localhost:${PORT}`
            );

            console.log(
                "================================"
            );

        }
    );

}


startServer();