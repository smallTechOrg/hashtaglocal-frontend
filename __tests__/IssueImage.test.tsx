import React from "react";
import { render } from "@testing-library/react-native";
import IssueImage from "@/components/IssueImage";

describe("IssueImage", () => {
  it("renders image carousel", () => {
    const { getByTestId } = render(
      <IssueImage
        imageSources={[
          "https://example.com/1.jpg",
          "https://example.com/2.jpg",
        ]}
        location="Jaipur"
        timestamp="26 Dec 2025"
        daysActive="3 days"
      />
    );

    expect(getByTestId("issue-location").props.children).toBe("Jaipur");
    expect(getByTestId("issue-timestamp").props.children).toBe("26 Dec 2025");
    expect(getByTestId("issue-days").props.children).toBe("3 days");
  });
});
