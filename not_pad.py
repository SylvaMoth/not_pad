import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path
import os


class NotPad:
    def __init__(self, root):
        self.root = root
        self.root.title("not_pad")
        self.root.geometry("800x600")
        
        # Track current file and original content
        self.current_file = None
        self.original_content = ""
        
        # Load default folder from config if it exists
        self.default_folder = self._load_default_folder()
        
        # Theme settings
        self.is_dark = self._load_theme_preference()
        self.themes = {
            "light": {
                "bg": "#ffffff",
                "fg": "#000000",
                "btn_bg": "#f0f0f0",
                "text_bg": "#ffffff",
                "text_fg": "#000000"
            },
            "dark": {
                "bg": "#1e1e1e",
                "fg": "#d4d4d4",
                "btn_bg": "#2d2d2d",
                "text_bg": "#1e1e1e",
                "text_fg": "#d4d4d4"
            }
        }
        
        # Build UI
        self._create_menu()
        self._create_text_area()
        self._apply_theme()
        
    def _load_default_folder(self):
        """Load default folder from config file if it exists"""
        config_path = Path(__file__).parent / "not_pad_config.txt"
        if config_path.exists():
            try:
                content = config_path.read_text(encoding="utf-8").strip()
                lines = content.split('\n')
                for line in lines:
                    if line.startswith('default_dir='):
                        folder = line.split('=', 1)[1].strip()
                        if folder and Path(folder).is_dir():
                            return folder
            except:
                pass
        return None
    
    def _load_theme_preference(self):
        """Load theme preference from config file"""
        config_path = Path(__file__).parent / "not_pad_config.txt"
        if config_path.exists():
            try:
                content = config_path.read_text(encoding="utf-8").strip()
                lines = content.split('\n')
                for line in lines:
                    if line.startswith('theme='):
                        theme = line.split('=', 1)[1].strip().lower()
                        return theme == 'dark'
            except:
                pass
        return False
    
    def _create_menu(self):
        """Create minimal button controls"""
        self.menu_frame = tk.Frame(self.root)
        self.menu_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        self.btn_new = tk.Button(self.menu_frame, text="New file", command=self.new_file)
        self.btn_new.pack(side=tk.LEFT, padx=2)
        
        self.btn_open = tk.Button(self.menu_frame, text="Open file", command=self.open_file)
        self.btn_open.pack(side=tk.LEFT, padx=2)
        
        self.btn_save = tk.Button(self.menu_frame, text="Save", command=self.save_file)
        self.btn_save.pack(side=tk.LEFT, padx=2)
        
        self.btn_theme = tk.Button(self.menu_frame, text="◐", command=self.toggle_theme, width=3)
        self.btn_theme.pack(side=tk.RIGHT, padx=2)
        
        # Filename label
        self.filename_label = tk.Label(self.menu_frame, text="No file loaded", fg="gray")
        self.filename_label.pack(side=tk.LEFT, padx=10)
    
    def _create_text_area(self):
        """Create main text editing area"""
        text_frame = tk.Frame(self.root)
        text_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Scrollbar
        scrollbar = tk.Scrollbar(text_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Text widget
        self.text_area = tk.Text(
            text_frame,
            wrap=tk.WORD,
            yscrollcommand=scrollbar.set,
            font=("Consolas", 14),
            undo=True
        )
        self.text_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.text_area.yview)
    
    def new_file(self):
        """Create a new file - ask user for location immediately"""
        initialdir = self.default_folder if self.default_folder else os.path.expanduser("~")
        
        filepath = filedialog.asksaveasfilename(
            initialdir=initialdir,
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")]
        )
        
        if not filepath:
            return
        
        # Create empty file
        Path(filepath).touch()
        
        # Load it
        self.current_file = filepath
        self.original_content = ""
        self.text_area.delete(1.0, tk.END)
        self._update_title()
    
    def open_file(self):
        """Open an existing markdown file"""
        initialdir = self.default_folder if self.default_folder else os.path.expanduser("~")
        
        filepath = filedialog.askopenfilename(
            initialdir=initialdir,
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")]
        )
        
        if not filepath:
            return
        
        # Read file content
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except Exception as e:
            messagebox.showerror("Error", f"Could not read file:\n{e}")
            return
        
        # Load into editor
        self.current_file = filepath
        self.original_content = content
        self.text_area.delete(1.0, tk.END)
        self.text_area.insert(1.0, content)
        self.text_area.mark_set(tk.INSERT, "1.0")  # Cursor at top
        self._update_title()
    
    def save_file(self):
        """Save current content - ask user to prepend or save separately"""
        # Get current text area content
        current_content = self.text_area.get(1.0, tk.END).rstrip("\n")
        
        if not current_content:
            messagebox.showwarning("Empty", "Nothing to save.")
            return
        
        # Ask user what to do
        dialog = tk.Toplevel(self.root)
        dialog.title("Save options")
        dialog.geometry("400x150")
        dialog.transient(self.root)
        dialog.grab_set()
        
        result = {"action": None}
        
        tk.Label(dialog, text="What would you like to do?", pady=10).pack()
        
        btn_frame = tk.Frame(dialog)
        btn_frame.pack(pady=10)
        
        def prepend_to_existing():
            result["action"] = "prepend"
            dialog.destroy()
        
        def save_new():
            result["action"] = "new"
            dialog.destroy()
        
        def cancel():
            dialog.destroy()
        
        tk.Button(btn_frame, text="Prepend to existing file", command=prepend_to_existing, width=25).pack(pady=5)
        tk.Button(btn_frame, text="Save as new file", command=save_new, width=25).pack(pady=5)
        tk.Button(btn_frame, text="Cancel", command=cancel, width=25).pack(pady=5)
        
        # Center dialog
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (dialog.winfo_width() // 2)
        y = (dialog.winfo_screenheight() // 2) - (dialog.winfo_height() // 2)
        dialog.geometry(f"+{x}+{y}")
        
        self.root.wait_window(dialog)
        
        # Execute action
        if result["action"] == "prepend":
            self._prepend_to_file(current_content)
        elif result["action"] == "new":
            self._save_as_new_file(current_content)
    
    def _prepend_to_file(self, new_content):
        """Prepend new content to an existing file"""
        initialdir = self.default_folder if self.default_folder else os.path.expanduser("~")
        
        filepath = filedialog.askopenfilename(
            initialdir=initialdir,
            title="Select file to prepend to",
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")]
        )
        
        if not filepath:
            return
        
        # Read existing content
        try:
            existing_content = Path(filepath).read_text(encoding="utf-8")
        except Exception as e:
            messagebox.showerror("Error", f"Could not read file:\n{e}")
            return
        
        # Combine: new on top, existing below
        final_content = new_content + "\n\n" + existing_content
        
        # Confirm before overwriting
        response = messagebox.askyesno(
            "Confirm prepend",
            f"Prepend to:\n{Path(filepath).name}?"
        )
        if not response:
            return
        
        # Write to disk
        try:
            Path(filepath).write_text(final_content, encoding="utf-8")
            messagebox.showinfo("Saved", "Content prepended successfully.")
            
            # Clear text area
            self.text_area.delete(1.0, tk.END)
            self.current_file = None
            self.original_content = ""
            self._update_title()
        except Exception as e:
            messagebox.showerror("Error", f"Could not save file:\n{e}")
    
    def _save_as_new_file(self, content):
        """Save content as a new file"""
        initialdir = self.default_folder if self.default_folder else os.path.expanduser("~")
        
        filepath = filedialog.asksaveasfilename(
            initialdir=initialdir,
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")]
        )
        
        if not filepath:
            return
        
        # Write to disk
        try:
            Path(filepath).write_text(content, encoding="utf-8")
            messagebox.showinfo("Saved", "File saved successfully.")
            
            # Clear text area
            self.text_area.delete(1.0, tk.END)
            self.current_file = None
            self.original_content = ""
            self._update_title()
        except Exception as e:
            messagebox.showerror("Error", f"Could not save file:\n{e}")
    
    def toggle_theme(self):
        """Toggle between light and dark theme"""
        self.is_dark = not self.is_dark
        self._apply_theme()
    
    def _apply_theme(self):
        """Apply current theme to all UI elements"""
        theme = self.themes["dark"] if self.is_dark else self.themes["light"]
        
        # Root window
        self.root.configure(bg=theme["bg"])
        
        # Menu frame
        self.menu_frame.configure(bg=theme["bg"])
        
        # Buttons
        for btn in [self.btn_new, self.btn_open, self.btn_save, self.btn_theme]:
            btn.configure(bg=theme["btn_bg"], fg=theme["fg"], activebackground=theme["bg"])
        
        # Filename label
        self.filename_label.configure(bg=theme["bg"], fg=theme["fg"])
        
        # Text area
        self.text_area.configure(
            bg=theme["text_bg"],
            fg=theme["text_fg"],
            insertbackground=theme["text_fg"]  # Cursor color
        )
    
    def _update_title(self):
        """Update window title and filename label"""
        if self.current_file:
            filename = Path(self.current_file).name
            self.root.title(f"not_pad - {filename}")
            self.filename_label.config(text=filename)
        else:
            self.root.title("not_pad")
            self.filename_label.config(text="No file loaded")


def main():
    root = tk.Tk()
    app = NotPad(root)
    root.mainloop()


if __name__ == "__main__":
    main()
