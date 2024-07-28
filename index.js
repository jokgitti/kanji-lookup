
import fetch from "node-fetch";
import * as path from 'path';
import fastcsv, { parseFile, writeToPath } from "fast-csv";

async function fetchExamples(kanji) {
    console.info(`Fetching examples for kanji: ${kanji}`);

    const url = `https://kanjiapi.dev/v1/words/${kanji}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const wordData = await response.json();

        console.info(`Fetched examples for kanji: ${kanji}`);

        const output = wordData.slice(0, 5).map(word => {
            const variant = word.variants[0]
            const meaning = word.meanings[0]

            return `${variant.written} (${variant.pronounced}): ${meaning.glosses.join(', ')}`
        })

        return output.join(', ');
    } catch (error) {
        console.error(`Failed to fetch example data for kanji: ${error.message}`);
    }
}

async function fetchKanjiData(kanji) {
    console.log(`Fetching data for kanji: ${kanji}`);
    const url = `https://kanjiapi.dev/v1/kanji/${kanji}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const kanjiData = await response.json();

        console.info(`Fetched data for kanji: ${kanji}`);

        const meaning = kanjiData.meanings.join(', ');
        const ja_on = kanjiData.on_readings.join(', ');
        const ja_kun = kanjiData.kun_readings.join(', ');

        // Assuming that "examples" can be derived from 'kanjiapi.dev' data
        //  const examples = await fetchExamples(kanji);

        const result = {
            kanji,
            meaning,
            ja_on,
            ja_kun,
            examples: ''
        };

        console.info(result);
        return result;
    } catch (error) {
        console.error(`Failed to fetch kanji data: ${error.message}`);
    }
}

async function processCSV(filePath) {
    const outputData = [];
    const input = []

    parseFile(filePath, { headers: true })
        .on('error', error => console.error(error))
        .on('data', (row) => {
            console.log('reading row', row);

            input.push(row);
        })
        .on('end', async (rowCount) => {
            console.log(`Parsed ${rowCount} rows`)
            console.log('input', input);

            for (const row of input) {
                const kanjiData = await fetchKanjiData(row.kanji);
                console.log('kanjiData', kanjiData);
                outputData.push({
                    kanji: kanjiData.kanji,
                    meaning: kanjiData.meaning,
                    ja_on: kanjiData.ja_on,
                    ja_kun: kanjiData.ja_kun,
                    examples: kanjiData.examples
                });
            }

            writeToPath(path.resolve('.', 'tmp.csv'), outputData, { headers: ['kanji', 'meaning', 'ja_on', 'ja_kun', 'examples'], delimiter: '\t' })
                .on('error', err => console.error(err))
                .on('finish', () => {
                    console.log('Done writing.')
                    process.exit(0);
                });
        });
}

// Read the CSV file path from command line arguments
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide a path to a CSV file as an argument');
    process.exit(1);
}

// Ensure the provided path is absolute
const absoluteFilePath = path.resolve(filePath);
processCSV(absoluteFilePath)