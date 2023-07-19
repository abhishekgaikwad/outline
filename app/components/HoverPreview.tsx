import { differenceInMinutes } from "date-fns";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Editor from "~/components/Editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { fadeAndSlideDown } from "~/styles/animations";
import { client } from "~/utils/ApiClient";
import Avatar from "./Avatar";
import { AvatarSize } from "./Avatar/Avatar";
import Flex from "./Flex";
import LoadingIndicator from "./LoadingIndicator";
import Text from "./Text";
import Time from "./Time";

const DELAY_OPEN = 300;
const DELAY_CLOSE = 300;

type Props = {
  /* The document associated with the editor, if any */
  id?: string;
  /* The HTML element that is being hovered over */
  element: HTMLAnchorElement;
  /* A callback on close of the hover preview */
  onClose: () => void;
};

function Info({ data }: any) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  if (data.type === "mention") {
    if (
      data.meta.lastViewedAt &&
      differenceInMinutes(new Date(), new Date(data.meta.lastViewedAt)) < 5
    ) {
      return (
        <Description type="tertiary" size="xsmall">
          {t("Currently viewing")}
        </Description>
      );
    }

    if (differenceInMinutes(new Date(), new Date(data.meta.lastActiveAt)) < 5) {
      return (
        <Description type="tertiary" size="xsmall">
          {t("Online now")} •&nbsp;
          {data.meta.lastViewedAt ? (
            <>
              {t("Viewed")}{" "}
              <Time dateTime={data.meta.lastViewedAt} addSuffix shorten />
            </>
          ) : (
            t("Never viewed")
          )}
        </Description>
      );
    }

    return (
      <Description type="tertiary" size="xsmall">
        {t("Online")}{" "}
        <Time dateTime={data.meta.lastActiveAt} addSuffix shorten /> •&nbsp;
        {data.meta.lastViewedAt ? (
          <>
            {t("Viewed")}{" "}
            <Time dateTime={data.meta.lastViewedAt} addSuffix shorten />
          </>
        ) : (
          t("Never viewed")
        )}
      </Description>
    );
  }

  return (
    <>
      <Description type="tertiary" size="xsmall">
        {data.meta.updatedAt === data.meta.createdAt ? (
          <>
            {data.meta.createdBy.id === currentUser.id
              ? t("You created")
              : t("{{ username }} created", {
                  username: data.meta.createdBy.name,
                })}{" "}
            <Time dateTime={data.meta.createdAt} addSuffix shorten />
          </>
        ) : (
          <>
            {data.meta.createdBy.id === currentUser.id
              ? t("You updated")
              : t("{{ username }} updated", {
                  username: data.meta.updatedBy.name,
                })}{" "}
            <Time dateTime={data.meta.updatedAt} addSuffix shorten />
          </>
        )}
      </Description>
      <React.Suspense fallback={<div />}>
        <Summary
          key={data.meta.id}
          defaultValue={data.meta.summary}
          embedsDisabled
          readOnly
        />
      </React.Suspense>
    </>
  );
}

function HoverPreviewInternal({ element, onClose }: Props) {
  const url = element.href || element.dataset.url;
  const [isVisible, setVisible] = React.useState(false);
  const timerClose = React.useRef<ReturnType<typeof setTimeout>>();
  const timerOpen = React.useRef<ReturnType<typeof setTimeout>>();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const stores = useStores();
  const { data, request, loading } = useRequest(() =>
    client.post("/urls.unfurl", {
      url,
      documentId: stores.ui.activeDocumentId,
    })
  );
  const prevUrl = usePrevious(url);
  const urlChanged = url !== prevUrl;

  React.useEffect(() => {
    if (urlChanged) {
      void request();
    }
  }, [urlChanged, request]);

  const startCloseTimer = React.useCallback(() => {
    stopOpenTimer();
    timerClose.current = setTimeout(() => {
      if (isVisible) {
        setVisible(false);
      }
      onClose();
    }, DELAY_CLOSE);
  }, [isVisible, onClose]);

  const stopCloseTimer = () => {
    if (timerClose.current) {
      clearTimeout(timerClose.current);
    }
  };

  const startOpenTimer = () => {
    timerOpen.current = setTimeout(() => setVisible(true), DELAY_OPEN);
  };

  const stopOpenTimer = () => {
    if (timerOpen.current) {
      clearTimeout(timerOpen.current);
    }
  };

  React.useEffect(() => {
    if (data && !loading) {
      startOpenTimer();

      if (cardRef.current) {
        cardRef.current.addEventListener("mouseenter", stopCloseTimer);
      }

      if (cardRef.current) {
        cardRef.current.addEventListener("mouseleave", startCloseTimer);
      }

      element.addEventListener("mouseout", startCloseTimer);
      element.addEventListener("mouseover", stopCloseTimer);
      element.addEventListener("mouseover", startOpenTimer);
    }

    return () => {
      element.removeEventListener("mouseout", startCloseTimer);
      element.removeEventListener("mouseover", stopCloseTimer);
      element.removeEventListener("mouseover", startOpenTimer);

      if (cardRef.current) {
        cardRef.current.removeEventListener("mouseenter", stopCloseTimer);
      }

      if (cardRef.current) {
        cardRef.current.removeEventListener("mouseleave", startCloseTimer);
      }

      stopCloseTimer();
    };
  }, [element, startCloseTimer, data, loading]);

  const anchorBounds = element.getBoundingClientRect();
  const cardBounds = cardRef.current?.getBoundingClientRect();
  const left = cardBounds
    ? Math.min(anchorBounds.left, window.innerWidth - 16 - 350)
    : anchorBounds.left;
  const leftOffset = anchorBounds.left - left;

  return !data || loading ? (
    <LoadingIndicator />
  ) : (
    <Portal>
      <Position
        top={anchorBounds.bottom + window.scrollY}
        left={left}
        aria-hidden
      >
        <div ref={cardRef}>
          {isVisible ? (
            <Animate>
              <Card>
                <Margin />
                <CardContent>
                  {data.type === "mention" ? (
                    <Content to="">
                      <Flex gap={12}>
                        <Avatar
                          model={{
                            avatarUrl: data.url,
                            initial: data.title ? data.title[0] : "?",
                            color: data.meta.color,
                          }}
                          size={AvatarSize.XLarge}
                        />
                        <Flex column>
                          <Heading>{data.title}</Heading>
                          <Info data={data} />
                        </Flex>
                      </Flex>
                    </Content>
                  ) : (
                    <Content to={data.url}>
                      <Flex column>
                        <Heading>{data.title}</Heading>
                        <Info data={data} />
                      </Flex>
                    </Content>
                  )}
                </CardContent>
              </Card>
              <Pointer offset={leftOffset + anchorBounds.width / 2} />
            </Animate>
          ) : null}
        </div>
      </Position>
    </Portal>
  );
}

function HoverPreview({ element, ...rest }: Props) {
  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  return <HoverPreviewInternal {...rest} element={element} />;
}

const Animate = styled.div`
  animation: ${fadeAndSlideDown} 150ms ease;

  @media print {
    display: none;
  }
`;

// fills the gap between the card and pointer to avoid a dead zone
const Margin = styled.div`
  position: absolute;
  top: -11px;
  left: 0;
  right: 0;
  height: 11px;
`;

const CardContent = styled.div`
  overflow: hidden;
  max-height: 20em;
  user-select: none;
`;

// &:after — gradient mask for overflow text
const Card = styled.div`
  backdrop-filter: blur(10px);
  background: ${s("background")};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  padding: 16px;
  width: 350px;
  font-size: 0.9em;
  position: relative;

  .placeholder,
  .heading-anchor {
    display: none;
  }

  &:after {
    content: "";
    display: block;
    position: absolute;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      ${(props) => transparentize(1, props.theme.background)} 0%,
      ${(props) => transparentize(1, props.theme.background)} 75%,
      ${s("background")} 90%
    );
    bottom: 0;
    left: 0;
    right: 0;
    height: 1.7em;
    border-bottom: 16px solid ${s("background")};
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const Position = styled.div<{ fixed?: boolean; top?: number; left?: number }>`
  margin-top: 10px;
  position: ${({ fixed }) => (fixed ? "fixed" : "absolute")};
  z-index: ${depths.hoverPreview};
  display: flex;
  max-height: 75%;

  ${({ top }) => (top !== undefined ? `top: ${top}px` : "")};
  ${({ left }) => (left !== undefined ? `left: ${left}px` : "")};
`;

const Pointer = styled.div<{ offset: number }>`
  top: -22px;
  left: ${(props) => props.offset}px;
  width: 22px;
  height: 22px;
  position: absolute;
  transform: translateX(-50%);
  pointer-events: none;

  &:before,
  &:after {
    content: "";
    display: inline-block;
    position: absolute;
    bottom: 0;
    right: 0;
  }

  &:before {
    border: 8px solid transparent;
    border-bottom-color: ${(props) =>
      props.theme.menuBorder || "rgba(0, 0, 0, 0.1)"};
    right: -1px;
  }

  &:after {
    border: 7px solid transparent;
    border-bottom-color: ${s("background")};
  }
`;

const Content = styled(Link)`
  cursor: var(--pointer);
  margin-bottom: 0;
  ${(props) => (!props.to ? "pointer-events: none;" : "")}
`;

const Heading = styled.h2`
  font-size: 1.25em;
  margin: 2px 0 0 0;
  color: ${s("text")};
`;

const Description = styled(Text)`
  margin-bottom: 0;
  padding-top: 2px;
`;

const Summary = styled(Editor)`
  margin-top: 8px;
`;

export default HoverPreview;
