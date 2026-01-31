import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path
import os
import sys

# Make app DPI-aware on Windows (before Tk initialization)
if sys.platform == "win32":
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass


class NotPad:
    def __init__(self, root):
        self.root = root
        self.root.overrideredirect(True)  # Remove default title bar
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
                "text_fg": "#000000",
                "select_bg": "#0078d7",
                "scrollbar_bg": "#f0f0f0",
                "scrollbar_trough": "#e0e0e0",
                "scrollbar_active": "#d0d0d0"
            },
            "dark": {
                "bg": "#1e1e1e",
                "fg": "#d4d4d4",
                "btn_bg": "#2d2d2d",
                "text_bg": "#1e1e1e",
                "text_fg": "#d4d4d4",
                "select_bg": "#e18944",
                "scrollbar_bg": "#2a2a2a",
                "scrollbar_trough": "#2a2a2a",
                "scrollbar_active": "#5a5a5a"
            }
        }
        
        # Build UI
        self._create_title_bar()
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
    
    def _create_title_bar(self):
        """Create custom title bar with window controls"""
        self.title_bar = tk.Frame(self.root, height=30, relief=tk.FLAT)
        self.title_bar.pack(side=tk.TOP, fill=tk.X)
        
        # Title label
        self.title_label = tk.Label(
            self.title_bar, 
            text="not_pad",
            font=("Segoe UI", 9),
            anchor=tk.W,
            padx=10
        )
        self.title_label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Window control buttons
        self.btn_close_window = tk.Button(
            self.title_bar,
            text="✕",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            command=self.root.quit
        )
        self.btn_close_window.pack(side=tk.RIGHT)
        
        self.btn_maximize = tk.Button(
            self.title_bar,
            text="□",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            command=self.toggle_maximize
        )
        self.btn_maximize.pack(side=tk.RIGHT)
        
        self.btn_minimize = tk.Button(
            self.title_bar,
            text="─",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            command=self.minimize_window
        )
        self.btn_minimize.pack(side=tk.RIGHT)
        
        # Make title bar draggable
        self.title_bar.bind("<Button-1>", self.start_drag)
        self.title_bar.bind("<B1-Motion>", self.on_drag)
        self.title_label.bind("<Button-1>", self.start_drag)
        self.title_label.bind("<B1-Motion>", self.on_drag)
        
        # Track window state
        self.is_maximized = False
        self.normal_geometry = None
    
    def start_drag(self, event):
        """Start dragging window"""
        self.drag_x = event.x
        self.drag_y = event.y
    
    def on_drag(self, event):
        """Drag window"""
        x = self.root.winfo_x() + event.x - self.drag_x
        y = self.root.winfo_y() + event.y - self.drag_y
        self.root.geometry(f"+{x}+{y}")
    
    def minimize_window(self):
        """Minimize window - create a dummy toplevel to restore focus"""
        # Store window geometry
        self.restore_geometry = self.root.geometry()
        # Withdraw the main window
        self.root.withdraw()
        # Create invisible toplevel that will appear in taskbar
        self.dummy = tk.Toplevel()
        self.dummy.title("not_pad")
        self.dummy.geometry("1x1")
        self.dummy.overrideredirect(False)
        # When dummy is clicked, restore main window
        self.dummy.bind("<FocusIn>", self.restore_from_minimize)
        self.dummy.iconify()
    
    def restore_from_minimize(self, event=None):
        """Restore window from minimized state"""
        if hasattr(self, 'dummy'):
            self.dummy.destroy()
            delattr(self, 'dummy')
        self.root.deiconify()
        if hasattr(self, 'restore_geometry'):
            self.root.geometry(self.restore_geometry)
        self.root.focus_force()
    
    def toggle_maximize(self):
        """Toggle maximize/restore window"""
        if self.is_maximized:
            # Restore
            if self.normal_geometry:
                self.root.geometry(self.normal_geometry)
            self.is_maximized = False
        else:
            # Maximize
            self.normal_geometry = self.root.geometry()
            screen_width = self.root.winfo_screenwidth()
            screen_height = self.root.winfo_screenheight()
            self.root.geometry(f"{screen_width}x{screen_height}+0+0")
            self.is_maximized = True
    
    def _create_menu(self):
        """Create minimal button controls"""
        self.menu_frame = tk.Frame(self.root)
        self.menu_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        self.btn_open = tk.Button(self.menu_frame, text="Open file", command=self.open_file)
        self.btn_open.pack(side=tk.LEFT, padx=2)
        
        self.btn_save = tk.Button(self.menu_frame, text="Save", command=self.save_file)
        self.btn_save.pack(side=tk.LEFT, padx=2)
        
        self.btn_close = tk.Button(self.menu_frame, text="Close", command=self.close_file)
        self.btn_close.pack(side=tk.LEFT, padx=2)
        
        self.btn_preview = tk.Button(self.menu_frame, text="Preview", command=self.show_preview)
        self.btn_preview.pack(side=tk.LEFT, padx=2)
        
        self.btn_theme = tk.Button(self.menu_frame, text="◐", command=self.toggle_theme, width=3)
        self.btn_theme.pack(side=tk.RIGHT, padx=2)
        
        # Filename label
        self.filename_label = tk.Label(self.menu_frame, text="No file loaded", fg="gray")
        self.filename_label.pack(side=tk.LEFT, padx=10)
    
    def _create_text_area(self):
        """Create main text editing area with custom scrollbar"""
        text_frame = tk.Frame(self.root)
        text_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Custom scrollbar - pack FIRST so it gets space
        self.scrollbar_canvas = tk.Canvas(text_frame, width=16, highlightthickness=0, borderwidth=0)
        self.scrollbar_canvas.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Scrollbar thumb - brighter color for visibility
        self.scroll_thumb = self.scrollbar_canvas.create_rectangle(2, 0, 14, 50, fill="#5a5a5a", outline="")
        
        # Text widget with Segoe UI - pack AFTER scrollbar
        self.text_area = tk.Text(
            text_frame,
            wrap=tk.WORD,
            font=("Segoe UI", 14),
            undo=True,
            relief=tk.FLAT,
            borderwidth=0
        )
        self.text_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Bind events
        self.text_area.bind("<Configure>", self.update_scrollbar)
        self.text_area.bind("<MouseWheel>", self.on_mousewheel)
        self.scrollbar_canvas.bind("<Button-1>", self.on_scrollbar_click)
        self.scrollbar_canvas.bind("<B1-Motion>", self.on_scrollbar_drag)
        
        # Update scrollbar when text changes
        self.text_area.bind("<<Modified>>", self.update_scrollbar)
        
        # Store text_frame for theme updates
        self.text_frame = text_frame
        
        # Initial scrollbar update
        self.root.after(100, self.update_scrollbar)
    
    def update_scrollbar(self, event=None):
        """Update custom scrollbar position and size"""
        # Get text widget scroll position
        first, last = self.text_area.yview()
        
        # Canvas height
        canvas_height = self.scrollbar_canvas.winfo_height()
        if canvas_height <= 1:
            canvas_height = 600  # Default
        
        # Calculate thumb position and size
        thumb_height = max(30, int(canvas_height * (last - first)))
        thumb_top = int(canvas_height * first)
        
        # Update thumb position (with padding from edges)
        self.scrollbar_canvas.coords(self.scroll_thumb, 2, thumb_top, 14, thumb_top + thumb_height)
        
        # Reset modified flag
        self.text_area.edit_modified(False)
    
    def on_mousewheel(self, event):
        """Handle mouse wheel scrolling"""
        self.text_area.yview_scroll(int(-1 * (event.delta / 120)), "units")
        self.update_scrollbar()
        return "break"
    
    def on_scrollbar_click(self, event):
        """Handle scrollbar click"""
        canvas_height = self.scrollbar_canvas.winfo_height()
        click_position = event.y / canvas_height
        self.text_area.yview_moveto(click_position)
        self.update_scrollbar()
    
    def on_scrollbar_drag(self, event):
        """Handle scrollbar drag"""
        canvas_height = self.scrollbar_canvas.winfo_height()
        drag_position = event.y / canvas_height
        drag_position = max(0, min(1, drag_position))
        self.text_area.yview_moveto(drag_position)
        self.update_scrollbar()
    
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
        
        # Title bar
        self.title_bar.configure(bg=theme["bg"])
        self.title_label.configure(bg=theme["bg"], fg=theme["fg"])
        for btn in [self.btn_minimize, self.btn_maximize, self.btn_close_window]:
            btn.configure(bg=theme["bg"], fg=theme["fg"], activebackground=theme["btn_bg"])
        
        # Menu frame
        self.menu_frame.configure(bg=theme["bg"])
        
        # Text frame
        self.text_frame.configure(bg=theme["bg"])
        
        # Buttons
        for btn in [self.btn_open, self.btn_save, self.btn_close, self.btn_preview, self.btn_theme]:
            btn.configure(bg=theme["btn_bg"], fg=theme["fg"], activebackground=theme["bg"])
        
        # Filename label
        self.filename_label.configure(bg=theme["bg"], fg=theme["fg"])
        
        # Custom scrollbar
        self.scrollbar_canvas.configure(bg=theme["scrollbar_trough"])
        self.scrollbar_canvas.itemconfig(self.scroll_thumb, fill=theme["scrollbar_active"])
        
        # Text area
        self.text_area.configure(
            bg=theme["text_bg"],
            fg=theme["text_fg"],
            insertbackground=theme["text_fg"],  # Cursor color
            selectbackground=theme["select_bg"],  # Selection highlight
            selectforeground=theme["text_fg"],
            highlightthickness=0,
            borderwidth=0
        )
    
    def close_file(self):
        """Close current file and clear text area"""
        if self.text_area.get(1.0, tk.END).strip():
            response = messagebox.askyesno(
                "Close file",
                "Close current file? Unsaved changes will be lost."
            )
            if not response:
                return
        
        self.text_area.delete(1.0, tk.END)
        self.current_file = None
        self.original_content = ""
        self._update_title()
    
    def show_preview(self):
        """Show rendered Markdown preview in a new window"""
        content = self.text_area.get(1.0, tk.END).strip()
        
        if not content:
            messagebox.showinfo("Preview", "Nothing to preview.")
            return
        
        # Create preview window
        preview_window = tk.Toplevel(self.root)
        preview_window.overrideredirect(True)  # Remove default title bar
        preview_window.geometry("800x600")
        
        # Apply current theme to preview window
        theme = self.themes["dark"] if self.is_dark else self.themes["light"]
        preview_window.configure(bg=theme["bg"])
        
        # Create title bar for preview window
        preview_title_bar = tk.Frame(preview_window, height=30, relief=tk.FLAT, bg=theme["bg"])
        preview_title_bar.pack(side=tk.TOP, fill=tk.X)
        
        preview_title_label = tk.Label(
            preview_title_bar,
            text="Markdown Preview",
            font=("Segoe UI", 9),
            anchor=tk.W,
            padx=10,
            bg=theme["bg"],
            fg=theme["fg"]
        )
        preview_title_label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Window control buttons for preview
        preview_close_btn = tk.Button(
            preview_title_bar,
            text="✕",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            bg=theme["bg"],
            fg=theme["fg"],
            activebackground=theme["btn_bg"],
            command=preview_window.destroy
        )
        preview_close_btn.pack(side=tk.RIGHT)
        
        preview_maximize_btn = tk.Button(
            preview_title_bar,
            text="□",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            bg=theme["bg"],
            fg=theme["fg"],
            activebackground=theme["btn_bg"],
            command=lambda: self.toggle_preview_maximize(preview_window)
        )
        preview_maximize_btn.pack(side=tk.RIGHT)
        
        preview_minimize_btn = tk.Button(
            preview_title_bar,
            text="─",
            font=("Segoe UI", 9),
            width=3,
            relief=tk.FLAT,
            bg=theme["bg"],
            fg=theme["fg"],
            activebackground=theme["btn_bg"],
            command=lambda: self.minimize_preview_window(preview_window)
        )
        preview_minimize_btn.pack(side=tk.RIGHT)
        
        # Track preview window state
        preview_window.is_maximized = False
        preview_window.normal_geometry = None
        
        # Make preview title bar draggable
        def start_preview_drag(event):
            preview_window.drag_x = event.x
            preview_window.drag_y = event.y
        
        def on_preview_drag(event):
            x = preview_window.winfo_x() + event.x - preview_window.drag_x
            y = preview_window.winfo_y() + event.y - preview_window.drag_y
            preview_window.geometry(f"+{x}+{y}")
        
        preview_title_bar.bind("<Button-1>", start_preview_drag)
        preview_title_bar.bind("<B1-Motion>", on_preview_drag)
        preview_title_label.bind("<Button-1>", start_preview_drag)
        preview_title_label.bind("<B1-Motion>", on_preview_drag)
        
        # Add content frame
        preview_frame = tk.Frame(preview_window, bg=theme["bg"])
        preview_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Custom scrollbar for preview
        preview_scrollbar_canvas = tk.Canvas(preview_frame, width=16, highlightthickness=0, borderwidth=0, bg=theme["scrollbar_trough"])
        preview_scrollbar_canvas.pack(side=tk.RIGHT, fill=tk.Y)
        
        preview_scroll_thumb = preview_scrollbar_canvas.create_rectangle(2, 0, 14, 50, fill=theme["scrollbar_active"], outline="")
        
        # Text widget for rendered content
        preview_text = tk.Text(
            preview_frame,
            wrap=tk.WORD,
            font=("Segoe UI", 11),
            bg=theme["bg"],
            fg=theme["fg"],
            relief=tk.FLAT,
            padx=20,
            pady=20,
            highlightthickness=0,
            borderwidth=0
        )
        preview_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Scrollbar functions for preview
        def update_preview_scrollbar(event=None):
            first, last = preview_text.yview()
            canvas_height = preview_scrollbar_canvas.winfo_height()
            if canvas_height <= 1:
                canvas_height = 600
            thumb_height = max(30, int(canvas_height * (last - first)))
            thumb_top = int(canvas_height * first)
            preview_scrollbar_canvas.coords(preview_scroll_thumb, 2, thumb_top, 14, thumb_top + thumb_height)
        
        def on_preview_mousewheel(event):
            preview_text.yview_scroll(int(-1 * (event.delta / 120)), "units")
            update_preview_scrollbar()
            return "break"
        
        def on_preview_scrollbar_click(event):
            canvas_height = preview_scrollbar_canvas.winfo_height()
            click_position = event.y / canvas_height
            preview_text.yview_moveto(click_position)
            update_preview_scrollbar()
        
        def on_preview_scrollbar_drag(event):
            canvas_height = preview_scrollbar_canvas.winfo_height()
            drag_position = event.y / canvas_height
            drag_position = max(0, min(1, drag_position))
            preview_text.yview_moveto(drag_position)
            update_preview_scrollbar()
        
        preview_text.bind("<Configure>", update_preview_scrollbar)
        preview_text.bind("<MouseWheel>", on_preview_mousewheel)
        preview_scrollbar_canvas.bind("<Button-1>", on_preview_scrollbar_click)
        preview_scrollbar_canvas.bind("<B1-Motion>", on_preview_scrollbar_drag)
        
        # Simple Markdown rendering
        self._render_markdown(preview_text, content, theme)
        
        preview_text.config(state=tk.DISABLED)
        
        # Initial scrollbar update
        preview_window.after(100, update_preview_scrollbar)
    
    def minimize_preview_window(self, preview_window):
        """Minimize preview window"""
        preview_window.restore_geometry = preview_window.geometry()
        preview_window.withdraw()
        # Create dummy for preview
        preview_dummy = tk.Toplevel()
        preview_dummy.title("Markdown Preview")
        preview_dummy.geometry("1x1")
        preview_dummy.overrideredirect(False)
        preview_window.dummy = preview_dummy
        
        def restore_preview(event=None):
            if hasattr(preview_window, 'dummy'):
                preview_window.dummy.destroy()
                delattr(preview_window, 'dummy')
            preview_window.deiconify()
            if hasattr(preview_window, 'restore_geometry'):
                preview_window.geometry(preview_window.restore_geometry)
            preview_window.focus_force()
        
        preview_dummy.bind("<FocusIn>", restore_preview)
        preview_dummy.iconify()
    
    def toggle_preview_maximize(self, preview_window):
        """Toggle maximize/restore for preview window"""
        if preview_window.is_maximized:
            # Restore
            if preview_window.normal_geometry:
                preview_window.geometry(preview_window.normal_geometry)
            preview_window.is_maximized = False
        else:
            # Maximize
            preview_window.normal_geometry = preview_window.geometry()
            screen_width = preview_window.winfo_screenwidth()
            screen_height = preview_window.winfo_screenheight()
            preview_window.geometry(f"{screen_width}x{screen_height}+0+0")
            preview_window.is_maximized = True
    
    def _render_markdown(self, text_widget, content, theme):
        """Simple Markdown rendering with basic formatting"""
        import re
        
        # Configure tags for formatting
        text_widget.tag_configure("h1", font=("Segoe UI", 24, "bold"), spacing3=10)
        text_widget.tag_configure("h2", font=("Segoe UI", 20, "bold"), spacing3=8)
        text_widget.tag_configure("h3", font=("Segoe UI", 16, "bold"), spacing3=6)
        text_widget.tag_configure("bold", font=("Segoe UI", 11, "bold"))
        text_widget.tag_configure("italic", font=("Segoe UI", 11, "italic"))
        text_widget.tag_configure("code", font=("Consolas", 10), background="#2d2d2d" if self.is_dark else "#f5f5f5")
        text_widget.tag_configure("code_block", font=("Consolas", 10), background="#2d2d2d" if self.is_dark else "#f5f5f5", spacing1=5, spacing3=5)
        text_widget.tag_configure("bullet", lmargin1=20, lmargin2=40)
        text_widget.tag_configure("quote", lmargin1=20, lmargin2=20, foreground="#888888")
        
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Code blocks
            if line.strip().startswith('```'):
                text_widget.insert(tk.END, '\n')
                i += 1
                code_lines = []
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                if code_lines:
                    text_widget.insert(tk.END, '\n'.join(code_lines) + '\n', "code_block")
                text_widget.insert(tk.END, '\n')
                i += 1
                continue
            
            # Headers
            if line.startswith('# '):
                text_widget.insert(tk.END, line[2:] + '\n', "h1")
            elif line.startswith('## '):
                text_widget.insert(tk.END, line[3:] + '\n', "h2")
            elif line.startswith('### '):
                text_widget.insert(tk.END, line[4:] + '\n', "h3")
            # Bullet points
            elif line.strip().startswith('- ') or line.strip().startswith('* '):
                bullet_text = line.strip()[2:]
                text_widget.insert(tk.END, '• ' + bullet_text + '\n', "bullet")
            # Blockquotes
            elif line.startswith('> '):
                text_widget.insert(tk.END, line[2:] + '\n', "quote")
            # Regular text with inline formatting
            else:
                self._insert_line_with_formatting(text_widget, line + '\n')
            
            i += 1
    
    def _insert_line_with_formatting(self, text_widget, line):
        """Insert a line with inline bold, italic, and code formatting"""
        import re
        
        # Process inline formatting
        pos = 0
        
        # Pattern for **bold**, *italic*, and `code`
        pattern = r'(\*\*.*?\*\*|\*.*?\*|`.*?`)'
        parts = re.split(pattern, line)
        
        for part in parts:
            if part.startswith('**') and part.endswith('**'):
                text_widget.insert(tk.END, part[2:-2], "bold")
            elif part.startswith('*') and part.endswith('*') and not part.startswith('**'):
                text_widget.insert(tk.END, part[1:-1], "italic")
            elif part.startswith('`') and part.endswith('`'):
                text_widget.insert(tk.END, part[1:-1], "code")
            else:
                text_widget.insert(tk.END, part)
    
    def _update_title(self):
        """Update window title and filename label"""
        if self.current_file:
            filename = Path(self.current_file).name
            self.title_label.config(text=f"not_pad - {filename}")
            self.filename_label.config(text=filename)
        else:
            self.title_label.config(text="not_pad")
            self.filename_label.config(text="No file loaded")


def main():
    root = tk.Tk()
    app = NotPad(root)
    root.mainloop()


if __name__ == "__main__":
    main()