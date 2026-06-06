const { getStreams } = require('./src/an1me/index.js'); // Ensure this path is correct

async function testAll() {
    console.log("Starting batch test...\n");

    // Simulating Nuvio's actual TMDB metadata payload
    // Using normal text, as TMDB rarely passes hyphenated slugs directly as the main title
    const testCases = [
        { 
            name: "Re:Zero", 
            id: '65123', 
            extra: { 
                title: 'Re:Zero - Starting Life in Another World', 
                name: 'Re:Zero', 
                originalTitle: 'Re:Zero kara Hajimeru Isekai Seikatsu' 
            } 
        },
        { 
            name: "Naruto", 
            id: '2150', 
            extra: { 
                title: 'Naruto', 
                name: 'Naruto', 
                originalTitle: 'Naruto' 
            } 
        },
        { 
            name: "Attack on Titan", 
            id: '1429', 
            extra: { 
                title: 'Attack on Titan', 
                name: 'Attack on Titan', 
                originalTitle: 'Shingeki no Kyojin' 
            } 
        },
        { 
            name: "Fullmetal Alchemist: Brotherhood", 
            id: '31911', 
            extra: { 
                title: 'Fullmetal Alchemist: Brotherhood', 
                name: 'Fullmetal Alchemist: Brotherhood',
                originalTitle: 'Hagane no Renkinjutsushi: Fullmetal Alchemist'
            } 
        }
    ];

    for (const testCase of testCases) {
        console.log(`=========================================`);
        console.log(`🎬 Testing: ${testCase.name} (ID: ${testCase.id})`);
        console.log(`=========================================`);
        
        try {
            // Fetch Season 1, Episode 1 for each show
            const streams = await getStreams(testCase.id, 'tv', 1, 1, testCase.extra);
            
            if (streams.length > 0) {
                console.log(`✅ Success! Found ${streams.length} stream(s):`);
                console.log(JSON.stringify(streams, null, 2));
            } else {
                console.log(`❌ No streams found for ${testCase.name}.`);
            }
        } catch (error) {
            console.error(`⚠️ Test failed for ${testCase.name} with error:`, error.message);
        }
        
        console.log('\n'); // Spacing between results
    }
    
    console.log("Batch testing complete!");
}

// Run the tests
testAll();