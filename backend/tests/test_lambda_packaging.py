import sys
import zipfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_lambda_package import build_package, REQUIRED_FILES

class TestLambdaPackaging(unittest.TestCase):
    def test_package_creation_and_contents(self):
        zip_path = build_package()
        self.assertTrue(zip_path.exists())

        with zipfile.ZipFile(zip_path, "r") as zf:
            namelist = zf.namelist()
            
            # Check all required production files exist in ZIP root
            for req in REQUIRED_FILES:
                self.assertIn(req, namelist)

            # Confirm security exclusion of non-production & secret files
            forbidden_substrings = [".env", "test", "node_modules", "package.json", ".git"]
            for name in namelist:
                for forbidden in forbidden_substrings:
                    self.assertNotIn(forbidden, name)

if __name__ == "__main__":
    unittest.main()
