import java.io.*;
import java.nio.file.*;
import java.util.*;

public class RemoveDuplicateLines {
    public static void main(String[] args) {
        String filePath = "dictionary.txt";

        try {
            List<String> lines = Files.readAllLines(Paths.get(filePath));

            // Use LinkedHashSet to preserve order while removing duplicates
            Set<String> uniqueLines = new LinkedHashSet<>();
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty()) {
                    uniqueLines.add(trimmed);
                }
            }

            Files.write(Paths.get(filePath), uniqueLines);

            System.out.println("Duplicate lines removed successfully.");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}