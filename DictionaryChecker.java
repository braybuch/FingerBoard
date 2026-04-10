import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DictionaryChecker {

    private static final String[] TUTORIAL = {
        "hi",
        "welcome to fingerboard",
        "press enter when the word on screen is correct",
        "press next if the word on screen is not correct",
        "fingerboard makes typing more efficient",
        "you do not need to type every letter",
        "the system will predict for you",
        "after a few presses the most likely word will usually appear",
        "common words become familiar very quickly with practice",
        "soon you will enter longer words without looking at the keyboard",
        "fingerboard is designed for comfortable and quick typing",
        "now begin practicing and let your fingers learn the patterns"
    };

    private static final String[] PRACTICE = {
        "the quick brown fox jumps over the lazy dog near the river bank",
        "typing every day helps improve both speed and accuracy over time",
        "a calm morning breeze carried leaves across the empty parking lot",
        "she packed her notebook, headphones, and charger before leaving home",
        "bright stars filled the sky as the city lights faded in the distance",
        "learning to type without looking at the keyboard takes steady practice",
        "the small coffee shop on the corner serves fresh bread every morning",
        "they finished reading the article just before the meeting began online",
        "rain tapped softly against the window during the quiet afternoon class",
        "simple habits repeated daily often lead to remarkable long term progress",
        "the bicycle leaned against the fence beside a row of blooming flowers",
        "several students stayed late to complete their science project together",
        "clear instructions make complex tasks easier to understand and complete",
        "the train arrived exactly on time despite the heavy snow last night",
        "fresh oranges and apples were arranged neatly in wooden market baskets",
        "a well designed typing test should balance challenge with readability",
        "the old library clock chimed twice as visitors entered through the hall",
        "music played softly in the background while the programmer wrote code",
        "each practice round should encourage focus rather than rushed mistakes",
        "winter sunlight reflected brightly off the frozen lake behind the school"
    };

    public static void main(String[] args) {
        String dictionaryFile = "dictionary.txt";
        String resultsFile = "results.txt";

        try {
            Set<String> dictionaryWords = loadDictionary(dictionaryFile);
            Set<String> missingWords = findMissingWords(dictionaryWords);

            writeResults(resultsFile, missingWords);

            System.out.println("Check complete.");
            System.out.println("Missing words found: " + missingWords.size());
            System.out.println("Results written to " + resultsFile);

        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }

    private static Set<String> loadDictionary(String filePath) throws IOException {
        Set<String> words = new HashSet<>();

        for (String line : Files.readAllLines(Paths.get(filePath))) {
            String word = line.trim().toLowerCase();
            if (!word.isEmpty()) {
                words.add(word);
            }
        }

        return words;
    }

    private static Set<String> findMissingWords(Set<String> dictionaryWords) {
        Set<String> missing = new TreeSet<>();

        List<String> allSentences = new ArrayList<>();
        allSentences.addAll(Arrays.asList(TUTORIAL));
        allSentences.addAll(Arrays.asList(PRACTICE));

        Pattern pattern = Pattern.compile("[a-zA-Z]+");

        for (String sentence : allSentences) {
            Matcher matcher = pattern.matcher(sentence.toLowerCase());

            while (matcher.find()) {
                String word = matcher.group();
                if (!dictionaryWords.contains(word)) {
                    missing.add(word);
                }
            }
        }

        return missing;
    }

    private static void writeResults(String filePath, Set<String> missingWords) throws IOException {
        Files.write(Paths.get(filePath), missingWords);
    }
}