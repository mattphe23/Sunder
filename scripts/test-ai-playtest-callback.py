#!/usr/bin/env python3
"""Regression tests for the inline AI playtesting callback workflow.

The workflow intentionally has no checkout. These tests extract its Python heredoc,
run it against synthetic GitHub workflow_run payloads, and patch urllib so no HTTP
request can leave the test process.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile
import textwrap
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/ai-playtest-callback.yml"
CALLBACK_URL = "https://api.manus.im/api/webhook/triggers/test-trigger"


class AcceptedResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class PlaytestCallbackWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")
        marker = "          python3 - <<'PY'\n"
        start = cls.workflow.index(marker) + len(marker)
        end = cls.workflow.index("\n          PY\n", start)
        cls.program = textwrap.dedent(cls.workflow[start:end])

    @staticmethod
    def valid_event():
        return {
            "repository": {"full_name": "mattphe23/Sunder"},
            "workflow_run": {
                "conclusion": "success",
                "head_branch": "main",
                "id": 121,
                "head_sha": "a" * 40,
            },
        }

    def run_callback(self, *, event=None, callback_url=CALLBACK_URL, include_event_path=True):
        with tempfile.TemporaryDirectory() as temporary_directory:
            event_path = Path(temporary_directory) / "workflow-run-event.json"
            if event is not None:
                event_path.write_text(json.dumps(event), encoding="utf-8")

            environment = {"CALLBACK_URL": callback_url}
            if include_event_path:
                environment["GITHUB_EVENT_PATH"] = str(event_path)

            request_mock = mock.Mock(return_value=AcceptedResponse())
            with mock.patch.dict(os.environ, environment, clear=True), mock.patch(
                "urllib.request.urlopen", request_mock
            ):
                try:
                    exec(self.program, {"__name__": "__main__"})
                except SystemExit as error:
                    return error.code, request_mock
            return 0, request_mock

    def test_uses_runner_event_path_not_an_actions_expression(self):
        self.assertNotIn("EVENT_FILE:", self.workflow)
        self.assertIn('os.environ.get("GITHUB_EVENT_PATH", "")', self.program)

    def test_posts_the_expected_payload_for_a_successful_main_run(self):
        exit_code, request_mock = self.run_callback(event=self.valid_event())

        self.assertEqual(exit_code, 0)
        request_mock.assert_called_once_with(mock.ANY, timeout=30)
        request = request_mock.call_args.args[0]
        self.assertEqual(request.full_url, CALLBACK_URL)
        self.assertEqual(request.get_method(), "POST")
        self.assertIn(("Content-type", "application/json"), request.header_items())
        self.assertEqual(
            json.loads(request.data),
            {
                "repository": "mattphe23/Sunder",
                "branch": "main",
                "conclusion": "success",
                "run_id": 121,
                "head_sha": "a" * 40,
            },
        )

    def test_rejects_wrong_repository_branch_or_conclusion_without_a_request(self):
        invalid_events = {
            "repository": {"full_name": "example/Sunder"},
            "branch": {"head_branch": "feature/not-main"},
            "conclusion": {"conclusion": "failure"},
        }
        for name, changes in invalid_events.items():
            with self.subTest(name=name):
                event = self.valid_event()
                if name == "repository":
                    event["repository"].update(changes)
                else:
                    event["workflow_run"].update(changes)

                exit_code, request_mock = self.run_callback(event=event)

                self.assertEqual(exit_code, "Callback scope mismatch. No request sent.")
                request_mock.assert_not_called()

    def test_rejects_missing_or_invalid_callback_url_without_a_request(self):
        for callback_url in ("", "https://attacker.invalid/api/webhook/triggers/test-trigger"):
            with self.subTest(callback_url=callback_url or "missing"):
                exit_code, request_mock = self.run_callback(
                    event=self.valid_event(), callback_url=callback_url
                )

                self.assertEqual(
                    exit_code,
                    "Missing or invalid SUNDER_PLAYTEST_TRIGGER_URL secret. No request sent.",
                )
                request_mock.assert_not_called()

    def test_rejects_a_missing_runner_event_path_without_a_request(self):
        exit_code, request_mock = self.run_callback(
            event=self.valid_event(), include_event_path=False
        )

        self.assertEqual(
            exit_code, "Missing GITHUB_EVENT_PATH runner environment. No request sent."
        )
        request_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
