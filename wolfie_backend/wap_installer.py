import tkinter as tk
from tkinter import ttk, messagebox
import time
import threading
import sys
import os

class WAPInstallerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Wolfie AI Prediction (WAP) Setup Wizard")
        self.root.geometry("500x350")
        self.root.resizable(False, False)
        
        # Configure style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#f0f0f0")
        style.configure("TLabel", background="#f0f0f0", font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"), foreground="#333333")
        style.configure("TButton", font=("Segoe UI", 9))
        
        self.main_frame = ttk.Frame(self.root, padding="20")
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        self.current_step = 0
        self.steps = [
            self.show_welcome,
            self.show_license,
            self.show_installing,
            self.show_finish
        ]
        
        self.load_step()

    def clear_frame(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()

    def load_step(self):
        self.clear_frame()
        self.steps[self.current_step]()

    def next_step(self):
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.load_step()

    def prev_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.load_step()

    def create_navigation(self, show_back=True, next_text="Next >", next_command=None):
        nav_frame = ttk.Frame(self.main_frame)
        nav_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(20, 0))
        
        ttk.Separator(nav_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=(0, 10))
        
        btn_frame = ttk.Frame(nav_frame)
        btn_frame.pack(side=tk.RIGHT)
        
        if show_back:
            ttk.Button(btn_frame, text="< Back", command=self.prev_step).pack(side=tk.LEFT, padx=5)
            
        cmd = next_command if next_command else self.next_step
        ttk.Button(btn_frame, text=next_text, command=cmd).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Cancel", command=self.root.destroy).pack(side=tk.LEFT, padx=5)

    def show_welcome(self):
        ttk.Label(self.main_frame, text="Welcome to the WAP Setup Wizard", style="Title.TLabel").pack(pady=(0, 20), anchor=tk.W)
        
        text = (
            "This wizard will guide you through the installation of the "
            "Wolfie AI Prediction (WAP) Engine.\n\n"
            "The WAP Engine provides advanced machine learning capabilities to "
            "predict food preparation and delivery times based on menus, "
            "ingredients, and real-time availability.\n\n"
            "Click Next to continue, or Cancel to exit Setup."
        )
        ttk.Label(self.main_frame, text=text, wraplength=450, justify=tk.LEFT).pack(anchor=tk.W, fill=tk.X)
        
        self.create_navigation(show_back=False)

    def show_license(self):
        ttk.Label(self.main_frame, text="License Agreement", style="Title.TLabel").pack(pady=(0, 10), anchor=tk.W)
        ttk.Label(self.main_frame, text="Please read the following important information before continuing.").pack(anchor=tk.W, pady=(0, 10))
        
        text_area = tk.Text(self.main_frame, height=8, width=50, font=("Consolas", 9))
        text_area.pack(fill=tk.BOTH, expand=True)
        license_text = """WOLFIE AI PREDICTION (WAP) - END USER LICENSE AGREEMENT

1. You may use this software for Wolfie operations.
2. The WAP engine will manage database schemas for menus and ingredients.
3. This installer will download necessary ML dependencies (scikit-learn, numpy).
"""
        text_area.insert(tk.END, license_text)
        text_area.config(state=tk.DISABLED)
        
        self.create_navigation()

    def show_installing(self):
        ttk.Label(self.main_frame, text="Installing...", style="Title.TLabel").pack(pady=(0, 20), anchor=tk.W)
        ttk.Label(self.main_frame, text="Please wait while Setup installs WAP Engine on your computer.").pack(anchor=tk.W)
        
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(self.main_frame, variable=self.progress_var, maximum=100)
        self.progress.pack(fill=tk.X, pady=20)
        
        self.status_label = ttk.Label(self.main_frame, text="Preparing to install...")
        self.status_label.pack(anchor=tk.W)
        
        # Disable navigation during install
        nav_frame = ttk.Frame(self.main_frame)
        nav_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(20, 0))
        ttk.Separator(nav_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=(0, 10))
        ttk.Button(nav_frame, text="Cancel", state=tk.DISABLED).pack(side=tk.RIGHT, padx=5)
        ttk.Button(nav_frame, text="Next >", state=tk.DISABLED).pack(side=tk.RIGHT, padx=5)
        ttk.Button(nav_frame, text="< Back", state=tk.DISABLED).pack(side=tk.RIGHT, padx=5)
        
        # Start installation thread
        threading.Thread(target=self.run_installation, daemon=True).start()

    def run_installation(self):
        steps = [
            ("Downloading machine learning models...", 20),
            ("Installing dependencies (scikit-learn, numpy)...", 40),
            ("Initializing Menu and Ingredients schemas...", 60),
            ("Configuring WAP Engine services...", 80),
            ("Finalizing setup...", 100)
        ]
        
        for msg, val in steps:
            time.sleep(1.5)  # Simulate work
            self.root.after(0, self.update_progress, msg, val)
            
        time.sleep(0.5)
        self.root.after(0, self.next_step)

    def update_progress(self, msg, val):
        self.status_label.config(text=msg)
        self.progress_var.set(val)

    def show_finish(self):
        ttk.Label(self.main_frame, text="Completing the WAP Setup Wizard", style="Title.TLabel").pack(pady=(0, 20), anchor=tk.W)
        
        text = (
            "Setup has finished installing Wolfie AI Prediction Engine on your computer.\n\n"
            "The backend is now ready to process intelligent ETA predictions based on "
            "menus, ingredients, and availability.\n\n"
            "Click Finish to exit Setup."
        )
        ttk.Label(self.main_frame, text=text, wraplength=450, justify=tk.LEFT).pack(anchor=tk.W)
        
        self.create_navigation(show_back=False, next_text="Finish", next_command=self.root.destroy)

if __name__ == "__main__":
    root = tk.Tk()
    app = WAPInstallerApp(root)
    root.mainloop()
