const styles = {
  green: "status-green",
  amber: "status-amber",
  red: "status-red",
  gray: "status-gray"
};

export function Status({ tone, children }: { tone: keyof typeof styles; children: React.ReactNode }) {
  return <span className={`status ${styles[tone]}`}>{children}</span>;
}
