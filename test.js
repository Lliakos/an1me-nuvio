const { getStreams } = require('./src/an1me/index.js');

async function testAll() {
    console.log("Starting batch test...\n");

    // Define the list of anime to test (TMDB ID and the slug/title Nuvio would pass)
    const testCases = [
        { name: "Re:Zero", id: '65123', extra: { title: 'rezero-kara-hajimeru-isekai-seikatsu' } },
        { name: "Naruto", id: '2150', extra: { title: 'naruto' } },
        { name: "Attack on Titan", id: '1429', extra: { title: 'shingeki-no-kyojin' } },
        { name: "Fullmetal Alchemist: Brotherhood", id: '31911', extra: { title: 'fullmetal-alchemist-brotherhood' } }
    ];

    for (const testCase of testCases) {
        console.log(`=========================================`);
        console.log(`🎬 Testing: ${testCase.name} (ID: ${testCase.id})`);
        console.log(`=========================================`);
        
        try {
            // Fetch Episode 1 for each show
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
        
        console.log('\n'); // Add some spacing between results
    }
    
    console.log("Batch testing complete!");
}

// Run the tests
testAll();