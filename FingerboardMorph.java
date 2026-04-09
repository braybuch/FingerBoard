import javax.swing.*;
import javax.swing.Timer;
import java.awt.*;
import java.util.*;
import java.util.List;

public class FingerboardMorph extends JPanel {

    static class KeyLabel {
        String text;
        double x, y;
        double startX, startY;
        double targetX, targetY;
        int group;

        KeyLabel(String text, double x, double y, int group) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.startX = x;
            this.startY = y;
            this.group = group;
        }

        void setTarget(double tx, double ty) {
            targetX = tx;
            targetY = ty;
        }

        void swapDirection() {
            double tx = startX;
            double ty = startY;
            startX = targetX;
            startY = targetY;
            targetX = tx;
            targetY = ty;
        }

        void interpolate(double t) {
            x = startX + (targetX - startX) * t;
            y = startY + (targetY - startY) * t;
        }
    }

    private final List<KeyLabel> keys = new ArrayList<>();
    private Timer timer;
    private double progress = 0.0;
    private JButton toggleButton;
    private boolean forward = true;
    private boolean firstRun = true;

    private static final int GROUP_COUNT = 4;
    private static final double GROUP_DELAY = 0.18;

    public FingerboardMorph(JButton button) {
        this.toggleButton = button;

        setPreferredSize(new Dimension(1200, 700));
        setBackground(new Color(245, 245, 245));

        buildKeyboard();
    }

    /* =======================================================
       INITIAL QWERTY KEYBOARD
       ======================================================= */
    private void buildKeyboard() {
        String[] row1 = {"q","w","e","r","t","y","u","i","o","p"};
        String[] row2 = {"a","s","d","f","g","h","j","k","l"};
        String[] row3 = {"z","x","c","v","b","n","m"};

        int keyW = 50;
        int gap = 5;

        int totalWidth = row1.length * keyW + (row1.length - 1) * gap;
        int startX = (1200 - totalWidth) / 2;
        int startY = 140;

        for (int i = 0; i < row1.length; i++) {
            int group = (i <= 6) ? 0 : 3;
            keys.add(new KeyLabel(row1[i], startX + i * (keyW + gap), startY, group));
        }

        for (int i = 0; i < row2.length; i++) {
            int group = (i <= 6) ? 1 : 3;
            keys.add(new KeyLabel(row2[i], startX + 25 + i * (keyW + gap), startY + 60, group));
        }

        for (int i = 0; i < row3.length; i++) {
            int group = (i <= 6) ? 2 : 2;
            keys.add(new KeyLabel(row3[i], startX + 65 + i * (keyW + gap), startY + 120, group));
        }
    }

    /* =======================================================
       FINAL FINGERBOARD TARGETS
       ======================================================= */
    private void assignFingerboardTargets() {
        Map<String, Point> map = new HashMap<>();

        int groupSpacing = 220;
        int colGap = 42;
        int rowGap = 30;

        int totalWidth = groupSpacing * 3 + 180;
        int startX = (getWidth() - totalWidth) / 2;
        int baseY = getHeight() / 2 + 40;

        int g1 = startX;
        assignRow(map, new String[]{"q","w","e","r"}, g1, baseY, colGap);
        assignRow(map, new String[]{"t","y","u"}, g1 + 20, baseY + rowGap, colGap);

        int g2 = startX + groupSpacing;
        assignRow(map, new String[]{"a","s","d","f"}, g2, baseY, colGap);
        assignRow(map, new String[]{"g","h","j"}, g2 + 20, baseY + rowGap, colGap);

        int g3 = startX + groupSpacing * 2;
        assignRow(map, new String[]{"z","x","c","v"}, g3, baseY, colGap);
        assignRow(map, new String[]{"b","n","m"}, g3 + 20, baseY + rowGap, colGap);

        int g4 = startX + groupSpacing * 3;
        assignRow(map, new String[]{"i","o","p"}, g4, baseY, colGap);
        assignRow(map, new String[]{"k","l"}, g4 + 30, baseY + rowGap, colGap);

        for (KeyLabel k : keys) {
            Point p = map.get(k.text);
            k.setTarget(p.x, p.y);
        }
    }

    private void assignRow(Map<String, Point> map, String[] letters, int x, int y, int gap) {
        for (int i = 0; i < letters.length; i++) {
            map.put(letters[i], new Point(x + i * gap, y));
        }
    }

    /* =======================================================
       START ANIMATION
       ======================================================= */
    @Override
    public void addNotify() {
        super.addNotify();

        SwingUtilities.invokeLater(() -> {
            assignFingerboardTargets();
            repaint();
        });
    }

    private void startAnimation() {
        if (timer != null && timer.isRunning()) return;

        progress = 0.0;

        timer = new Timer(16, e -> {
            progress += 0.008;

            if (progress >= 1.0 + GROUP_DELAY * (GROUP_COUNT - 1)) {
                progress = 1.0 + GROUP_DELAY * (GROUP_COUNT - 1);
                timer.stop();
                forward = !forward;
                toggleButton.setText(forward ? "Animate Forward" : "Animate Backward");
            }

            for (KeyLabel k : keys) {
                double localT = (progress - k.group * GROUP_DELAY);
                localT = Math.max(0, Math.min(1, localT));
                localT = easeInOut(localT);
                k.interpolate(localT);
            }

            repaint();
        });

        timer.start();
    }

    private void reverseAnimationDirection() {
        if (!firstRun) {
            for (KeyLabel k : keys) {
                k.swapDirection();
            }
        }
        firstRun = false;
        startAnimation();
    }

    private double easeInOut(double t) {
        return t < 0.5
                ? 2 * t * t
                : -1 + (4 - 2 * t) * t;
    }

    /* =======================================================
       DRAWING
       ======================================================= */
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);

        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);

        drawTitle(g2);

        for (KeyLabel k : keys) {
            drawKey(g2, k);
        }
    }

    private void drawTitle(Graphics2D g2) {
        g2.setFont(new Font("SansSerif", Font.BOLD, 26));
        String title = "QWERTY ↔ FingerBoard Layout Morph";

        FontMetrics fm = g2.getFontMetrics();
        int x = (getWidth() - fm.stringWidth(title)) / 2;

        g2.setColor(Color.BLACK);
        g2.drawString(title, x, 60);
    }

    private void drawKey(Graphics2D g2, KeyLabel k) {
        int w = 42;
        int h = 42;

        int x = (int) k.x;
        int y = (int) k.y;

        g2.setColor(Color.WHITE);
        g2.fillRoundRect(x, y, w, h, 12, 12);

        g2.setColor(new Color(210, 210, 210));
        g2.drawRoundRect(x, y, w, h, 12, 12);

        g2.setColor(Color.BLACK);
        FontMetrics fm = g2.getFontMetrics();

        int tx = x + (w - fm.stringWidth(k.text)) / 2;
        int ty = y + (h + fm.getAscent()) / 2 - 4;

        g2.drawString(k.text, tx, ty);
    }

    /* =======================================================
       MAIN
       ======================================================= */
    public static void main(String[] args) {
        JFrame frame = new JFrame("FingerBoard Morph Animation");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLayout(new BorderLayout());

        JButton button = new JButton("Animate Forward");
        FingerboardMorph panel = new FingerboardMorph(button);

        button.addActionListener(e -> panel.reverseAnimationDirection());

        frame.add(panel, BorderLayout.CENTER);
        frame.add(button, BorderLayout.SOUTH);

        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}