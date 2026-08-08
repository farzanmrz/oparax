import unittest
import base64
import json
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
        self.assertEqual(outreach.next_record(store, "send")["handle"], "@Reporter")

        outreach.resolve_record(store, CONFIG, "@Reporter", "x_done", None, None)
        self.assertEqual(store["records"][0]["state"], "x_done")
        self.assertIsNone(outreach.next_record(store, "send"))
        outreach.validate_store(store, CONFIG)

    def test_unavailable_can_be_rechecked(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "x_unav"}],
        }
        self.assertEqual(outreach.next_record(store, "recheck")["handle"], "@Reporter")
        outreach.resolve_record(store, CONFIG, "@Reporter", "x_av", "Reporter Name", "Reporter")
        self.assertEqual(store["records"][0]["state"], "x_av")

    def test_second_unavailable_check_becomes_invalid(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "x_unav"}],
        }
        outreach.resolve_record(store, CONFIG, "@Reporter", "c_inv", None, None)
        self.assertEqual(store["records"][0]["state"], "c_inv")
        self.assertIsNone(outreach.next_record(store, "recheck"))

    def test_unavailable_cannot_reenter_recheck_queue(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "x_unav"}],
        }
        with self.assertRaises(outreach.OutreachError):
            outreach.resolve_record(store, CONFIG, "@Reporter", "x_unav", None, None)
        self.assertEqual(store["records"][0]["state"], "x_unav")

    def test_invalid_transition_leaves_state_unchanged(self):
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
                }
            ],
        }
        self.assertEqual(store["records"][0]["state"], "x_av")
        with self.assertRaises(outreach.OutreachError):
            outreach.resolve_record(store, CONFIG, "@Reporter", "c_new", None, None)
        self.assertEqual(store["records"][0]["state"], "x_av")

    def test_handles_are_unique_case_insensitively(self):
        store = {
            "version": 1,
            "records": [{"handle": "@Reporter", "vertical": "nfl", "state": "c_new"}],
        }
        with self.assertRaises(outreach.OutreachError):
            outreach.add_record(store, "nfl", "@reporter")

    def test_status_counts_dmed(self):
        store = {
            "version": 1,
            "records": [
                {"handle": "@One", "vertical": "nfl", "state": "x_done"},
                {"handle": "@Two", "vertical": "nfl", "state": "x_done"},
            ],
        }
        counts = Counter(record["state"] for record in store["records"])
        self.assertEqual(counts["x_done"], 2)
        report = outreach.status_markdown(store)
        self.assertIn("| nfl | 2 | 0 | 0 | 2 | 0 | 0 |", report)

    def test_queue_count_is_global_across_verticals(self):
        store = {
            "version": 1,
            "records": [
                {"handle": "@One", "vertical": "football", "state": "x_unav"},
                {"handle": "@Two", "vertical": "nba", "state": "x_unav"},
                {"handle": "@Three", "vertical": "nfl", "state": "c_inv"},
            ],
        }
        self.assertEqual(outreach.queue_count(store, "recheck"), 2)

    def test_check_batch_resolves_whole_queue(self):
        store = {
            "version": 1,
            "records": [
                {
                    "handle": "@One",
                    "vertical": "nfl",
                    "state": "c_new",
                    "display_name": "One Reporter",
                    "first_name": "One",
                },
                {
                    "handle": "@Two",
                    "vertical": "nfl",
                    "state": "c_new",
                    "display_name": "Two Reporter",
                    "first_name": "Two",
                },
            ],
        }
        results = outreach.apply_check_batch(
            store,
            CONFIG,
            "check",
            [
                {"handle": "@One", "outcome": "available"},
                {"handle": "@Two", "outcome": "unavailable"},
            ],
        )
        self.assertEqual([item["state"] for item in results], ["x_av", "x_unav"])
        self.assertEqual(outreach.queue_count(store, "check"), 0)

    def test_recheck_batch_marks_still_unavailable_invalid(self):
        store = {
            "version": 1,
            "records": [
                {
                    "handle": "@Reporter",
                    "vertical": "nfl",
                    "state": "x_unav",
                    "display_name": "Reporter Name",
                    "first_name": "Reporter",
                }
            ],
        }
        outreach.apply_check_batch(
            store,
            CONFIG,
            "recheck",
            [{"handle": "@Reporter", "outcome": "unavailable"}],
        )
        self.assertEqual(store["records"][0]["state"], "c_inv")

    def test_empty_search_result_marks_new_contact_invalid(self):
        store = {
            "version": 1,
            "records": [
                {
                    "handle": "@Reporter",
                    "vertical": "nfl",
                    "state": "c_new",
                    "display_name": "Reporter Name",
                    "first_name": "Reporter",
                }
            ],
        }
        outreach.apply_check_batch(
            store,
            CONFIG,
            "check",
            [{"handle": "@Reporter", "outcome": "invalid"}],
        )
        self.assertEqual(store["records"][0]["state"], "c_inv")

    def test_empty_search_result_marks_unavailable_contact_invalid(self):
        store = {
            "version": 1,
            "records": [
                {
                    "handle": "@Reporter",
                    "vertical": "nfl",
                    "state": "x_unav",
                    "display_name": "Reporter Name",
                    "first_name": "Reporter",
                }
            ],
        }
        outreach.apply_check_batch(
            store,
            CONFIG,
            "recheck",
            [{"handle": "@Reporter", "outcome": "invalid"}],
        )
        self.assertEqual(store["records"][0]["state"], "c_inv")

    def test_decode_batch(self):
        value = [{"handle": "@Reporter", "outcome": "available"}]
        payload = base64.b64encode(json.dumps(value).encode()).decode()
        self.assertEqual(outreach.decode_batch(payload), value)


if __name__ == "__main__":
    unittest.main()
