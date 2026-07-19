import unittest
from collections import Counter

import outreach


CONFIG = {
    "version": 1,
    "verticals": {
        "nfl": {"template": "Hey [name], test message."},
    },
}


class OutreachStateTests(unittest.TestCase):
    def test_complete_contact_lifecycle(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "c_new"}],
        }

        prepared = outreach.resolve_record(
            store,
            CONFIG,
            "@reporter",
            "x_av",
            "Reporter Name",
            "Reporter",
        )
        self.assertEqual(prepared["message"], "Hey Reporter, test message.")
        self.assertEqual(prepared["leanspark_contact"], "Reporter Name (@Reporter)")
        self.assertEqual(outreach.next_record(store, "send")["handle"], "@Reporter")

        outreach.resolve_record(store, CONFIG, "@Reporter", "x_done", None, None)
        self.assertEqual(outreach.next_record(store, "lean")["contact"], "Reporter Name (@Reporter)")
        outreach.resolve_record(store, CONFIG, "@Reporter", "l_done", None, None)
        self.assertIsNone(outreach.next_record(store, "lean"))
        outreach.validate_store(store, CONFIG)

    def test_unavailable_can_be_rechecked(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "x_unav"}],
        }
        self.assertEqual(outreach.next_record(store, "recheck")["handle"], "@Reporter")
        outreach.resolve_record(store, CONFIG, "@Reporter", "x_av", "Reporter Name", "Reporter")
        self.assertEqual(store["records"][0]["state"], "x_av")

    def test_failed_send_requires_no_state_transition(self):
        store = {
            "version": 1,
            "records": [
                {
                    "handle": "@Reporter",
                    "vertical": "nfl",
                    "state": "x_av",
                    "display_name": "Reporter Name",
                    "first_name": "Reporter",
                    "message": "Hey Reporter, test message.",
                    "leanspark_contact": "Reporter Name (@Reporter)",
                }
            ],
        }
        self.assertEqual(store["records"][0]["state"], "x_av")
        with self.assertRaises(outreach.OutreachError):
            outreach.resolve_record(store, CONFIG, "@Reporter", "l_done", None, None)
        self.assertEqual(store["records"][0]["state"], "x_av")

    def test_handles_are_unique_case_insensitively(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "c_new"}],
        }
        with self.assertRaises(outreach.OutreachError):
            outreach.add_record(store, "nfl", "@reporter")

    def test_status_counts_logged_contacts_as_dmed(self):
        store = {
            "version": 1,
            "records": [
                {"handle": "@One", "vertical": "nfl", "state": "x_done"},
                {"handle": "@Two", "vertical": "nfl", "state": "l_done"},
            ],
        }
        counts = Counter(record["state"] for record in store["records"])
        self.assertEqual(counts["x_done"] + counts["l_done"], 2)
        report = outreach.status_markdown(store)
        self.assertIn("| nfl | 2 | 0 | 0 | 2 |", report)


if __name__ == "__main__":
    unittest.main()
